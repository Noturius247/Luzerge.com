# Architecture & DNS Setup Guide

## 1. Full System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         LUZERGE.COM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

 ┌───────────────────────────────────────────────────────────────────────┐
 │                         DEVELOPER WORKFLOW                             │
 │                                                                        │
 │   Local Dev ──git push──▶ GitHub (main branch)                        │
 │                                  │                                    │
 │                                  ▼                                    │
 │                         GitHub Actions CI/CD                          │
 │                         ┌────────────────┐                            │
 │                         │ 1. Lint & Test │                            │
 │                         │ 2. Build assets│                            │
 │                         │ 3. Deploy to   │                            │
 │                         │    Supabase    │                            │
 │                         │ 4. Purge CF    │                            │
 │                         │    Cache       │                            │
 │                         └────────────────┘                            │
 └───────────────────────────────────────────────────────────────────────┘

 ┌──────────────┐    DNS     ┌─────────────────────────────────────────┐
 │   luzerge.com│───Query───▶│         CLOUDFLARE (Free Tier)          │
 │  (Registrar) │            │                                         │
 └──────────────┘            │  ┌──────────────────────────────────┐   │
                             │  │         DNS Management            │   │
                             │  │  A     @    → Supabase IP        │   │
                             │  │  CNAME www  → luzerge.com        │   │
                             │  │  CNAME api  → xxx.supabase.co    │   │
                             │  │  MX    @    → mail server        │   │
                             │  └──────────────────────────────────┘   │
                             │                                         │
                             │  ┌──────────────────────────────────┐   │
                             │  │        Security Layer             │   │
                             │  │  • SSL/TLS: Full (Strict)        │   │
                             │  │  • HSTS enabled                  │   │
                             │  │  • WAF: OWASP ruleset            │   │
                             │  │  • Bot Fight Mode: ON            │   │
                             │  │  • DDoS Protection: Auto         │   │
                             │  └──────────────────────────────────┘   │
                             │                                         │
                             │  ┌──────────────────────────────────┐   │
                             │  │         Cache Rules               │   │
                             │  │  • *.css, *.js: 1 year           │   │
                             │  │  • *.jpg, *.png: 1 year          │   │
                             │  │  • /api/*: bypass cache          │   │
                             │  │  • HTML: 4 hours                 │   │
                             │  └──────────────────────────────────┘   │
                             │                                         │
                             │  ┌──────────────────────────────────┐   │
                             │  │      Edge (PoP Locations)         │   │
                             │  │  • Singapore  (primary for PH)   │   │
                             │  │  • Hong Kong  (secondary)        │   │
                             │  │  • Tokyo      (backup)           │   │
                             │  └──────────────────────────────────┘   │
                             └─────────────────────────────────────────┘
                                              │
                                  Cache MISS  │  Cache HIT → return to user
                                              ▼
                             ┌─────────────────────────────────────────┐
                             │              SUPABASE ORIGIN             │
                             │                                         │
                             │  ┌──────────────┐  ┌────────────────┐  │
                             │  │  Static Site  │  │  Edge Functions│  │
                             │  │  (Storage CDN)│  │  (Deno runtime)│  │
                             │  └──────────────┘  └────────────────┘  │
                             │         │                   │           │
                             │         ▼                   ▼           │
                             │  ┌──────────────────────────────────┐   │
                             │  │        PostgreSQL Database        │   │
                             │  │  • leads table                   │   │
                             │  │  • contacts table                │   │
                             │  │  • analytics_events table        │   │
                             │  │  • Row Level Security (RLS)      │   │
                             │  └──────────────────────────────────┘   │
                             └─────────────────────────────────────────┘
```

---

## 2. DNS Configuration (Cloudflare)

### Step 1: Buy Your Domain

**Option A — Cloudflare Registrar (Recommended)**
- Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Registrar → Register Domain
- Search `luzerge.com` — at-cost pricing (~$8.57/yr for .com)
- DNS automatically managed; no transfer needed

**Option B — Namecheap**
- Buy at namecheap.com (~$9–12/yr)
- Go to Domain → Custom DNS → set nameservers to:
  ```text
  ns1.cloudflare.com
  ns2.cloudflare.com
  ```
- Add site in Cloudflare → it will scan existing DNS records

### Step 2: DNS Records in Cloudflare

Navigate to your domain → DNS → Records. Add the following:

```text
Type    Name    Content                         Proxy   TTL
──────  ──────  ──────────────────────────────  ──────  ────
A       @       76.76.21.21                     ON      Auto
CNAME   www     luzerge.com                     ON      Auto
CNAME   api     <project>.supabase.co           ON      Auto
MX      @       route1.mx.cloudflare.net        OFF     Auto
TXT     @       v=spf1 include:_spf.mx...       OFF     Auto
```

> The orange cloud icon (Proxy: ON) means traffic routes through Cloudflare CDN.
> Keep MX and TXT records as DNS-only (grey cloud) — email must not be proxied.

### Step 3: SSL/TLS Configuration

Go to SSL/TLS → Overview:
- Set mode to **Full (Strict)**

Go to SSL/TLS → Edge Certificates:
- Enable **Always Use HTTPS**: ON
- Enable **HTTP Strict Transport Security (HSTS)**: ON
  - Max Age: 6 months
  - Include Subdomains: Yes
  - Preload: Yes (after you're confident)
- Enable **Minimum TLS Version**: TLS 1.2
- Enable **Opportunistic Encryption**: ON
- Enable **TLS 1.3**: ON

---

## 3. Cloudflare Cache Configuration

### Cache Rules (Rules → Cache Rules)

**Rule 1: Cache Static Assets Aggressively**
```text
When: File extension matches (css, js, jpg, jpeg, png, gif, svg, ico, woff, woff2, ttf)
Then:
  Cache Level: Cache Everything
  Browser TTL: 1 year
  Edge TTL: 1 month
  Respect Origin Cache Control: OFF
```

**Rule 2: Cache HTML Pages**
```text
When: URI path does NOT contain /api/
  AND Content-Type contains text/html
Then:
  Cache Level: Cache Everything
  Browser TTL: 4 hours
  Edge TTL: 4 hours
```

**Rule 3: Bypass Cache for API**
```text
When: URI path starts with /api/
  OR  URI path starts with /auth/
  OR  URI path starts with /storage/
Then:
  Cache Level: Bypass
  Disable Performance
```

### Page Rules (Legacy — use Cache Rules above instead)
```text
luzerge.com/api/*         → Cache Level: Bypass
luzerge.com/*             → Cache Level: Standard, SSL: Full
```

---

## 4. Cloudflare Performance Settings

Navigate to Speed → Optimization:

```text
Optimization Setting          Value
────────────────────────────  ──────────────
Auto Minify (HTML/CSS/JS)     ON
Brotli compression            ON
Early Hints                   ON
Rocket Loader                 ON (test first — may conflict with some JS)
HTTP/2                        ON
HTTP/3 (with QUIC)            ON
0-RTT Connection Resumption   ON
```

Navigate to Speed → Image Optimization (if on Pro):
```text
Polish: Lossy
WebP: ON
Mirage: ON (mobile image optimization)
```

---

## 5. Security Settings

### Firewall / WAF Rules

Navigate to Security → WAF → Custom Rules:

**Rule: Block Bad Bots**
```text
Field: User Agent
Operator: contains
Value: (curl|wget|python-requests|scrapy|zgrab)
Action: Challenge (JS Challenge)
```

**Rule: Rate Limit API Endpoint**
```text
Field: URI Path
Operator: starts with
Value: /api/
Action: Rate Limit — 100 requests per minute per IP
Response: 429 Too Many Requests
```

**Rule: Country Allow-List (Optional — PH-focused)**
```text
Field: Country
Operator: is not in
Value: [Philippines, Singapore, US, Australia, Japan]
Action: Managed Challenge
```

Navigate to Security → Bots:
```text
Bot Fight Mode: ON
Super Bot Fight Mode: ON (Pro plan)
```

---

## 6. Supabase Configuration

### Project Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Login and link
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# Start local dev
supabase start
```

### Custom Domain on Supabase (Pro plan)

1. Go to Supabase Dashboard → Project Settings → Custom Domains
2. Add `api.luzerge.com`
3. Add the provided CNAME in Cloudflare DNS (DNS-only, grey cloud)
4. Wait for verification (~10 minutes)

> On free tier: use the default `<project>.supabase.co` URL for API calls.

---

## 7. GitHub Repository Structure

```text
luzerge.com/                        (GitHub repo root)
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml              # Push to main → deploy to prod
│   │   └── preview.yml             # PR → deploy preview
│   └── CODEOWNERS                  # Protect main branch
├── src/                            # Frontend source
├── supabase/                       # Backend source
├── cloudflare/                     # Worker scripts
├── docs/                           # This documentation
└── scripts/                        # Utility scripts
```

### Branch Strategy

```text
main          → Production (luzerge.com)
develop       → Staging / QA
feature/*     → Feature branches (PR into develop)
hotfix/*      → Emergency fixes (PR directly into main)
```

---

## 8. Data Flow — Contact Form Submission

```text
1. User fills form at luzerge.com/contact
        │
        ▼
2. Browser POSTs to /api/contact
   (Cloudflare proxies, cache bypassed)
        │
        ▼
3. Cloudflare WAF checks request
   (rate limit, bot check, headers)
        │
        ▼
4. Supabase Edge Function receives request
   (Deno runtime, runs at edge)
        │
        ├─▶ Validates input (name, email, message)
        ├─▶ Inserts row into leads table (PostgreSQL)
        └─▶ Sends email via Resend API / SMTP
                │
                ▼
5. 200 OK response → browser shows success message
```

---

## 9. Latency Benchmarks (Expected)

| Route                                | Latency (est.) | Notes                      |
|--------------------------------------|----------------|----------------------------|
| Cebu → Cloudflare SG (cache hit)     | 30–60ms        | Static assets, fully cached|
| Cebu → Cloudflare SG (cache miss)    | 60–100ms       | First request, cold cache  |
| Cebu → Supabase SG (API call)        | 80–150ms       | Dynamic, uncached          |
| Cebu → US origin (no CDN)            | 250–400ms      | Baseline without CDN       |

> Cloudflare Singapore PoP is the closest edge node to Cebu, Philippines.
