# Luzerge.com — CDN-Powered Business Platform (Cebu, PH)

> **Stack:** Cloudflare CDN + Supabase Backend + GitHub CI/CD
> **Target:** Low-cost, high-performance web platform for Cebu-based clients
> **Domain:** luzerge.com

---

## Architecture Overview

```text
                    ┌──────────────────────────────────────────────────┐
                    │             TRAFFIC FLOW DIAGRAM                  │
                    └──────────────────────────────────────────────────┘

 [Cebu Users]             [Cloudflare Edge]              [Supabase Origin]
 ┌──────────┐   HTTPS    ┌─────────────────┐   HTTPS    ┌──────────────┐
 │ Browser  │───────────▶│ Cloudflare PoP  │───────────▶│ Supabase API │
 │  (Cebu)  │            │ (Singapore/HK)  │            │ (Singapore)  │
 └──────────┘            │                 │            │              │
                         │ ┌─────────────┐ │            │ ┌──────────┐ │
 ┌──────────┐            │ │  Cache Hit  │ │            │ │PostgreSQL│ │
 │  Mobile  │───────────▶│ │  (static)   │ │            │ │ Database │ │
 │  (Cebu)  │            │ └─────────────┘ │            │ └──────────┘ │
 └──────────┘            │                 │            │              │
                         │ ┌─────────────┐ │            │ ┌──────────┐ │
 ┌──────────┐            │ │WAF/Security │ │            │ │ Storage  │ │
 │ Business │───────────▶│ │ DDoS Prot.  │ │            │ │ (Bucket) │ │
 │  Client  │            │ └─────────────┘ │            │ └──────────┘ │
 └──────────┘            │                 │            │              │
                         │ ┌─────────────┐ │            │ ┌──────────┐ │
                         │ │SSL/TLS Term │ │            │ │  Edge    │ │
                         │ │  (HTTPS)    │ │            │ │Functions │ │
                         │ └─────────────┘ │            │ └──────────┘ │
                         └─────────────────┘            └──────────────┘
                                  │ Cache MISS only
                                  ▼
                         ┌─────────────────┐
                         │  GitHub Pages   │
                         │ (Static Assets) │
                         │  via Actions    │
                         └─────────────────┘
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/luzerge.com.git
cd luzerge.com

# 2. Install Supabase CLI
npm install -g supabase

# 3. Link to your Supabase project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 4. Push database migrations
supabase db push

# 5. Deploy edge functions
supabase functions deploy

# 6. Deploy frontend (auto via GitHub Actions on push to main)
git push origin main
```

---

## Project Structure

```text
luzerge.com/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Production deployment
│       └── preview.yml         # PR preview deployments
├── src/
│   ├── index.html              # Landing page
│   ├── css/
│   │   └── styles.css          # Optimized CSS
│   └── js/
│       └── app.js              # Frontend JavaScript
├── supabase/
│   ├── config.toml             # Supabase project config
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── api/
│           └── index.ts        # Edge function entrypoint
├── cloudflare/
│   └── workers/
│       └── edge-cache.js       # Cloudflare Worker
├── docs/
│   ├── BUSINESS_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── SETUP_GUIDE.md
│   └── MONITORING.md
└── scripts/
    ├── setup.sh
    └── test-cdn.sh
```

---

## Cost Breakdown (Monthly — Free Tier)

| Service              | Plan      | Cost/mo    | Limits                           |
|----------------------|-----------|------------|----------------------------------|
| Cloudflare           | Free      | $0         | Unlimited bandwidth, basic WAF   |
| Supabase             | Free      | $0         | 500MB DB, 1GB storage, 500K API  |
| GitHub               | Free      | $0         | Unlimited repos + Actions        |
| Domain (luzerge.com) | Yearly    | ~$1/mo     | Namecheap / Cloudflare Registrar |
| **Total**            |           | **~$1/mo** | (domain amortized annually)      |

> Upgrade path: Supabase Pro ($25/mo) + Cloudflare Pro ($20/mo) when traffic exceeds free tier.

---

## Documentation

- [Business Plan](docs/BUSINESS_PLAN.md)
- [Architecture & DNS Setup](docs/ARCHITECTURE.md)
- [Step-by-Step Setup Guide](docs/SETUP_GUIDE.md)
- [Monitoring & Performance](docs/MONITORING.md)
