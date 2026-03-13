#!/usr/bin/env bash
# ============================================================
# Luzerge.com — CDN & Deployment Validation Script
# Run: bash scripts/test-cdn.sh [domain]
# Example: bash scripts/test-cdn.sh luzerge.com
# ============================================================

set -euo pipefail

DOMAIN="${1:-luzerge.com}"
BASE_URL="https://$DOMAIN"
PASS=0; FAIL=0; WARN=0

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

pass() { echo -e "${GREEN}  PASS${NC}  $*"; ((PASS++)) || true; }
fail() { echo -e "${RED}  FAIL${NC}  $*"; ((FAIL++)) || true; }
warn() { echo -e "${YELLOW}  WARN${NC}  $*"; ((WARN++)) || true; }
info() { echo -e "${BLUE}  INFO${NC}  $*"; }

echo -e "\n${BOLD}Luzerge CDN Validation — $DOMAIN${NC}"
echo "================================================"
echo ""

# ─── 1. DNS Resolution ──────────────────────────────────────────────────────

echo -e "${BOLD}[1] DNS Resolution${NC}"

DNS_IP=$(dig +short "$DOMAIN" @1.1.1.1 | tail -1)
if [ -n "$DNS_IP" ]; then
  pass "Domain resolves to: $DNS_IP"
  # Check if it's a Cloudflare IP range (104.21.x.x or 172.67.x.x)
  if echo "$DNS_IP" | grep -qE '^(104\.21\.|172\.67\.)'; then
    pass "IP is in Cloudflare range (proxied)"
  else
    warn "IP does not appear to be Cloudflare proxied — check orange cloud in DNS settings"
  fi
else
  fail "Domain does not resolve"
fi
echo ""

# ─── 2. SSL/TLS ─────────────────────────────────────────────────────────────

echo -e "${BOLD}[2] SSL/TLS Certificate${NC}"

SSL_EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [ -n "$SSL_EXPIRY" ]; then
  pass "SSL certificate valid — expires: $SSL_EXPIRY"
else
  fail "Could not retrieve SSL certificate"
fi

# Check TLS version
TLS_VER=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
  | grep "Protocol" | awk '{print $3}')
if [ -n "$TLS_VER" ]; then
  pass "TLS version: $TLS_VER"
fi
echo ""

# ─── 3. HTTP Response Codes ──────────────────────────────────────────────────

echo -e "${BOLD}[3] HTTP Response Codes${NC}"

check_status() {
  local url="$1"; local expected="$2"; local label="$3"
  local status
  status=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "$url")
  if [ "$status" = "$expected" ]; then
    pass "$label → HTTP $status"
  else
    fail "$label → Expected $expected, got $status"
  fi
}

check_status "$BASE_URL/"              "200" "Homepage"
check_status "$BASE_URL/api/ping"      "200" "API health endpoint"
check_status "http://$DOMAIN/"         "301" "HTTP→HTTPS redirect"
check_status "https://www.$DOMAIN/"    "301" "www→apex redirect"
check_status "$BASE_URL/nonexistent"   "404" "404 handling"
echo ""

# ─── 4. Cache Headers ────────────────────────────────────────────────────────

echo -e "${BOLD}[4] Cloudflare Cache Behavior${NC}"

check_cache() {
  local url="$1"; local label="$2"; local should_cache="$3"
  local headers
  headers=$(curl -sI --max-time 10 "$url" 2>/dev/null)
  local cf_status
  cf_status=$(echo "$headers" | grep -i "cf-cache-status" | awk '{print $2}' | tr -d '\r')
  local cache_control
  cache_control=$(echo "$headers" | grep -i "cache-control" | cut -d: -f2- | tr -d '\r ')

  if [ "$should_cache" = "yes" ]; then
    if [ "$cf_status" = "HIT" ] || [ "$cf_status" = "MISS" ]; then
      if [ "$cf_status" = "HIT" ]; then
        pass "$label → CF-Cache-Status: HIT ✓"
      else
        warn "$label → CF-Cache-Status: MISS (first request — will be HIT next time)"
      fi
    else
      fail "$label → CF-Cache-Status: $cf_status (expected HIT or MISS)"
    fi
  else
    if [ "$cf_status" = "BYPASS" ] || [ "$cf_status" = "DYNAMIC" ] || [ -z "$cf_status" ]; then
      pass "$label → Cache bypassed (correct for dynamic)"
    else
      warn "$label → CF-Cache-Status: $cf_status (should be BYPASS for API routes)"
    fi
  fi

  if [ -n "$cache_control" ]; then
    info "Cache-Control: $cache_control"
  fi
}

# Make two requests to static assets to warm cache
curl -s "$BASE_URL/css/styles.css" > /dev/null
curl -s "$BASE_URL/js/app.js" > /dev/null
sleep 1

check_cache "$BASE_URL/css/styles.css" "CSS file"       "yes"
check_cache "$BASE_URL/js/app.js"      "JS file"        "yes"
check_cache "$BASE_URL/api/ping"       "API endpoint"   "no"
echo ""

# ─── 5. Security Headers ─────────────────────────────────────────────────────

echo -e "${BOLD}[5] Security Headers${NC}"

HEADERS=$(curl -sI --max-time 10 "$BASE_URL/" 2>/dev/null)

check_header() {
  local header="$1"; local label="${2:-$header}"
  if echo "$HEADERS" | grep -qi "^$header:"; then
    VALUE=$(echo "$HEADERS" | grep -i "^$header:" | cut -d: -f2- | tr -d '\r' | xargs)
    pass "$label: $VALUE"
  else
    warn "$label header missing"
  fi
}

check_header "x-content-type-options"  "X-Content-Type-Options"
check_header "x-frame-options"         "X-Frame-Options"
check_header "strict-transport-security" "HSTS"
check_header "content-security-policy" "Content-Security-Policy"
echo ""

# ─── 6. Performance ──────────────────────────────────────────────────────────

echo -e "${BOLD}[6] Performance Metrics${NC}"

TIMING=$(curl -w "DNS:%{time_namelookup}s Connect:%{time_connect}s TLS:%{time_appconnect}s TTFB:%{time_starttransfer}s Total:%{time_total}s" \
  -o /dev/null -s --max-time 15 "$BASE_URL/")
echo "  $TIMING"

TTFB=$(echo "$TIMING" | grep -oP 'TTFB:\K[\d.]+')
TTFB_MS=$(echo "$TTFB * 1000" | bc 2>/dev/null || echo "N/A")

if [ "$TTFB_MS" != "N/A" ]; then
  if (( $(echo "$TTFB_MS < 200" | bc -l 2>/dev/null || echo 0) )); then
    pass "TTFB: ${TTFB_MS}ms (excellent — under 200ms)"
  elif (( $(echo "$TTFB_MS < 500" | bc -l 2>/dev/null || echo 0) )); then
    warn "TTFB: ${TTFB_MS}ms (acceptable — under 500ms)"
  else
    fail "TTFB: ${TTFB_MS}ms (slow — check CDN configuration)"
  fi
fi
echo ""

# ─── 7. API Endpoint Tests ───────────────────────────────────────────────────

echo -e "${BOLD}[7] API Endpoint Tests${NC}"

# Health check
PING_RESPONSE=$(curl -s --max-time 10 "$BASE_URL/api/ping" 2>/dev/null)
if echo "$PING_RESPONSE" | grep -q '"status":"ok"'; then
  pass "API ping: $PING_RESPONSE"
else
  fail "API ping failed: $PING_RESPONSE"
fi

# Contact form validation (should reject invalid data)
INVALID_STATUS=$(curl -o /dev/null -s -w "%{http_code}" \
  -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"invalid","message":""}' \
  --max-time 10)

if [ "$INVALID_STATUS" = "422" ]; then
  pass "Contact form rejects invalid input → HTTP 422"
else
  warn "Contact form returned $INVALID_STATUS for invalid input (expected 422)"
fi
echo ""

# ─── Summary ────────────────────────────────────────────────────────────────

echo "────────────────────────────────────────────"
echo -e "${BOLD}Test Summary for $DOMAIN${NC}"
echo -e "  ${GREEN}PASS: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  ${YELLOW}WARN: $WARN${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Action required: $FAIL test(s) failed. Review output above.${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}All critical tests passed with $WARN warning(s). Review warnings above.${NC}"
  exit 0
else
  echo -e "${GREEN}All tests passed! CDN is configured correctly.${NC}"
  exit 0
fi
