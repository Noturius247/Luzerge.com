# Luzerge.com — Business Plan
**Location:** Cebu City, Philippines
**Model:** CDN-Powered Web Services for SMEs

---

## 1. Executive Summary

Luzerge.com is a Cebu-based web services startup delivering fast, affordable, and
professionally managed websites and digital storefronts for local businesses. By
leveraging Cloudflare's global CDN (with edge nodes in Singapore and Hong Kong,
closest to Cebu), Supabase's managed backend, and GitHub-driven automation, the
platform achieves enterprise-grade reliability at near-zero infrastructure cost.

**Core Value Proposition:**
- Sub-200ms page loads for Cebu users via Cloudflare edge caching
- Zero-downtime deployments through GitHub Actions
- Fully managed SSL, DDoS protection, and WAF — included free
- Transparent pricing with no hidden server costs for clients

---

## 2. Market Opportunity — Cebu, Philippines

### Target Segments

| Segment                  | Est. Count (Cebu) | Pain Point                        |
|--------------------------|-------------------|-----------------------------------|
| Small retail shops       | 15,000+           | No online presence                |
| Food & beverage (F&B)    | 8,000+            | Slow or shared hosting            |
| Real estate brokers      | 2,000+            | No lead capture system            |
| Professional services    | 5,000+            | Outdated websites                 |
| Tourism & hospitality    | 1,500+            | Poor mobile performance           |

### Why CDN Matters in Cebu

Philippine internet has high latency to US/EU servers (200–400ms RTT). Cloudflare's
Singapore PoP is ~30ms from Cebu — delivering 6–10x faster page loads for cached
assets compared to origin-only hosting.

---

## 3. Service Offerings

### Tier 1 — Starter Site (₱2,500/mo)
- Static landing page hosted via GitHub Pages + Cloudflare CDN
- 1 custom domain connection
- SSL certificate (free via Cloudflare)
- Basic contact form (Supabase edge function)
- Monthly performance report

### Tier 2 — Business Site (₱5,500/mo)
- Full website (5–10 pages) with CMS-style editing
- Supabase PostgreSQL database (leads, products, bookings)
- Cloudflare caching + WAF rules
- Google Analytics + Search Console integration
- Business email setup (Google Workspace or Zoho)
- 2 content updates/month included

### Tier 3 — E-Commerce / App (₱12,000/mo)
- Custom web app with Supabase Auth + Storage
- Product catalog with Supabase real-time
- Payment integration (PayMongo for PH)
- Cloudflare Workers for edge logic
- Full CI/CD pipeline via GitHub Actions
- Priority support + weekly backups

### One-Time Setup Fees

| Service                        | Fee        |
|--------------------------------|------------|
| Domain registration            | ₱700–1,200 |
| Initial site build (Tier 1)    | ₱8,000     |
| Initial site build (Tier 2)    | ₱20,000    |
| Initial site build (Tier 3)    | ₱50,000+   |
| Logo/branding add-on           | ₱5,000     |
| SEO setup (on-page)            | ₱8,000     |

---

## 4. Revenue Model

### Year 1 Projections (Conservative)

| Quarter | New Clients | MRR          | Setup Revenue |
|---------|-------------|--------------|---------------|
| Q1      | 3           | ₱12,000      | ₱36,000       |
| Q2      | 5           | ₱30,000      | ₱60,000       |
| Q3      | 8           | ₱58,000      | ₱96,000       |
| Q4      | 10          | ₱88,000      | ₱120,000      |

**Year 1 Total Revenue:** ~₱900,000–₱1.1M

### Break-Even Analysis

Monthly fixed costs (Year 1):
- Domain + hosting (Supabase Pro upgrade at scale): ₱1,500
- Tools (analytics, invoicing): ₱500
- Marketing (Facebook Ads, Cebu SME groups): ₱3,000
- Miscellaneous: ₱1,000

**Break-even:** 2 Tier 1 clients or 1 Tier 2 client monthly

---

## 5. Client Acquisition Strategy

### Digital Channels
1. **Facebook & Instagram Ads** — Target Cebu business owners (₱3,000/mo budget)
2. **Google My Business** — Local SEO for "web design Cebu"
3. **LinkedIn** — Target Cebu Chamber of Commerce members
4. **Referral program** — 10% commission for referring clients

### Physical Channels
1. **SM City Cebu & Ayala Center** — Attend SME bazaars and trade fairs
2. **IT Park Cebu networking events**
3. **Partnerships with Cebu accountants/lawyers** (they refer clients needing websites)
4. **QR code flyers** in Cebu Business Park

### Content Marketing
- Blog: "How Cebu businesses can get customers online" (target local SEO keywords)
- YouTube shorts showing before/after website speed improvements
- Free website audit for the first 20 leads (generates trust + data)

---

## 6. Competitive Advantages

| Factor              | Luzerge.com             | Typical Cebu Agency      | Freelancer        |
|---------------------|-------------------------|--------------------------|-------------------|
| CDN Performance     | Global edge (30ms Cebu) | Shared hosting (200ms+)  | Varies            |
| SSL/Security        | Cloudflare WAF (free)   | Basic SSL only           | Basic SSL         |
| Deployment          | Git-based, automated    | Manual FTP               | Manual            |
| Scalability         | Supabase auto-scales    | Fixed server plan        | N/A               |
| Pricing             | Transparent, tiered     | Custom quotes            | Hourly/project    |
| Support             | SLA-backed              | Best effort              | Best effort       |
| Code Ownership      | Client owns GitHub repo | Agency owns code         | Varies            |

---

## 7. Operations Plan

### Team Structure (Year 1)
- **Founder/Lead Dev** — Full-stack + client management
- **Freelance Designer** (contract per project) — UI/UX design
- **VA / Admin** (10 hrs/mo) — Invoicing, scheduling, emails

### Tools & Stack
- **Code:** VS Code + GitHub
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **CDN:** Cloudflare (free tier, upgrade to Pro at 20+ clients)
- **Payments:** PayMongo (PH) + PayPal (international)
- **Invoicing:** Wave (free) or FreshBooks
- **Communication:** Discord (team) + WhatsApp (clients)
- **Project management:** Notion (free)

---

## 8. Legal & Compliance (Philippines)

1. **DTI Business Registration** — Register "Luzerge" as sole proprietorship (~₱500)
2. **BIR Registration** — Get TIN, register for VAT or non-VAT (₱500 + misc fees)
3. **Mayor's Permit** — Barangay clearance + City of Cebu business permit (~₱2,000)
4. **Data Privacy Act (RA 10173)** — Register with NPC if handling personal data
5. **Contracts** — Use written service agreements with IP assignment clauses

### Recommended Business Type
- **Sole Proprietorship** for Year 1 (fastest, cheapest to set up)
- **OPC (One Person Corporation)** when revenue exceeds ₱3M/yr for liability protection

---

## 9. Growth Roadmap

```text
Year 1: Foundation
  ├── Launch luzerge.com with full CDN stack
  ├── Acquire 10–15 retainer clients
  ├── Build portfolio of Cebu business sites
  └── Establish referral network

Year 2: Scale
  ├── Hire 1 junior developer
  ├── Launch white-label reseller program
  ├── Add PayMongo e-commerce template
  └── Expand to Mandaue, Lapu-Lapu, Mactan

Year 3: Platform
  ├── Build self-serve client dashboard
  ├── Launch "Cebu Business CDN" as branded product
  └── Target Visayas-wide market
```

---

## 10. Risk Analysis

| Risk                          | Probability | Impact  | Mitigation                              |
|-------------------------------|-------------|---------|------------------------------------------|
| Supabase free tier exceeded   | Medium      | Medium  | Monitor usage, upgrade at 80% threshold  |
| Cloudflare policy changes     | Low         | High    | Keep origin deployable independently     |
| Client churn                  | Medium      | Medium  | Annual contracts with 3-month minimum    |
| Philippine peso depreciation  | Low         | Low     | Price in PHP, costs are largely PHP too  |
| Internet outage in Cebu       | Low         | Medium  | Cloudflare caches assets at edge         |
