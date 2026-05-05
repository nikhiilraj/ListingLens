# ListingLens

**Amazon listing image auditor powered by 4 parallel AI agents.**

![ListingLens](./banner.svg)

Paste an Amazon listing URL. In 90 seconds, four AI agents analyse your images, benchmark your competitors, check your AI search visibility, and generate a structured design brief — ready to hand to a designer or paste directly into Pixii.

**[Live Demo](https://listinglens-seven.vercel.app/)** · Built in 2 days as a project submission for [Pixii.ai](https://pixii.ai)

---

## The problem it solves

Amazon sellers spend $5,000 and 9 weeks working with agencies to improve their listing images. Most don't know which specific images are failing or why. There's no fast, affordable way to get a diagnostic before spending that money.

ListingLens does the audit in 90 seconds, for free, and tells you exactly what to fix.

---

## How it works

One input — an Amazon listing URL. Four agents run in parallel:

| Agent | What it does |
|---|---|
| **Visual Auditor** | Scores every listing image across 12 CRO levers using Claude Vision |
| **Review Intelligence** | Extracts what customers actually care about from review text — and finds what your images are ignoring |
| **AI Search Visibility** | Queries Claude and Gemini with real shopper questions to check if your product appears |
| **Category Benchmarker** | Pulls the top 5 competitors, fetches their hero images, and maps the visual strategies in your category |

A fifth synthesis step cross-references all four agent outputs and generates a final report: an overall score, a per-image breakdown, the biggest conversion leak, a competitor comparison, and a structured Pixii design brief.

The agents stream their progress live to the browser as they work. The user watches the reasoning happen in real time.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Edge runtime, SSE streaming, Vercel-native |
| Language | TypeScript | Schema validation on all AI outputs |
| AI SDK | Vercel AI SDK 6 | `generateObject`, structured outputs, streaming |
| Vision + text | Claude Sonnet 4.6 | Best quality-to-cost for image analysis at this volume |
| Cross-platform check | Gemini 2.5 Flash | AI search audit needs a second LLM to be meaningful |
| Amazon data | SerpAPI | `amazon_product` engine — structured data, no scraping |
| Review scraping | Firecrawl | Agent 2, with graceful fixture fallback if blocked |
| State | Upstash Redis | Rate limiting, ASIN caching (24h TTL), result permalinks |
| Hosting | Vercel + Fluid Compute | Free tier, 60s function timeout, Edge SSE streaming |
| Score card export | Satori + @vercel/og | Server-side PNG generation, no browser canvas issues |

---

## Architecture

```
Browser → POST /api/analyse (SSE stream)
              │
              ├── SerpAPI: fetch product data by ASIN
              │
              ├── Promise.allSettled([
              │     Agent 1: Visual Auditor    → Claude Vision
              │     Agent 2: Review Intel      → Firecrawl + Claude
              │     Agent 3: AI Search         → Claude + Gemini
              │     Agent 4: Benchmarker       → SerpAPI + Claude Vision
              │   ])
              │
              ├── Synthesis Agent → Claude (cross-references all 4)
              │
              └── Redis: save result → return permalink
```

Every agent streams status updates to the browser as it runs. `Promise.allSettled` means one failing agent never breaks the pipeline — the report generates from whatever completed.

All Claude outputs use `generateObject` with Zod schemas. The SDK enforces structured output at the protocol level. No manual JSON parsing anywhere.

---

## Key decisions

**Why SSE over WebSockets** — the connection is one-directional (server pushes status to browser). SSE is simpler, works natively with Next.js Edge Runtime, and doesn't require a separate WebSocket server.

**Why `Promise.allSettled` over `Promise.all`** — resilience. If Firecrawl is blocked by Amazon, Agent 2 returns null and the other three complete normally. The synthesis agent handles missing inputs gracefully.

**Why SerpAPI over scraping Amazon directly** — Amazon blocks scrapers aggressively. SerpAPI's `amazon_product` endpoint returns structured JSON reliably. The images array, bullet points, title, and rating are all available without a single scrape.

**Why Upstash Redis** — HTTP-based, works in Edge functions without connection pool management. The 24h ASIN cache means the same listing analysed twice returns instantly and costs zero API credits on the second run.

**Why Zod schemas on every Claude output** — Claude occasionally returns slightly different field names or structures between calls. Zod catches mismatches before they reach the UI and the SDK retries automatically with a corrective message.

---

## Running locally

```bash
git clone https://github.com/yourusername/listinglens
cd listinglens
npm install
```

Copy `.env.example` to `.env.local` and fill in the keys:

```bash
cp .env.example .env.local
```

Required environment variables:

```
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
SERPAPI_KEY=
FIRECRAWL_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DEV_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Set `DEV_MODE=true` during development. Agents return pre-cached fixture data instead of calling the real APIs — fast iteration, zero credit spend.

```bash
npm run dev
```

Open `http://localhost:3000`. Paste any Amazon listing URL.

---

## Project structure

```
lib/
  agents/          # One file per agent — pure functions, never throw
  apis/            # All external API clients — nothing calls APIs directly
  prompts/         # Every Claude prompt as a named exported constant
  schemas/         # All Zod schemas — agents validate output here
  fixtures/        # Pre-cached data for DEV_MODE

components/
  hero/            # URL input
  dashboard/       # Live agent cards
  report/          # Score, image breakdown, before/after, Pixii brief

app/
  api/analyse/     # Main SSE pipeline
  api/proxy-image/ # Amazon CDN bypass — images fetched server-side
  results/[id]/    # Shareable permalink page
```

---

## What I learned building this

**Prompt engineering determines output quality more than any other factor.** The visual rubric prompt — which tells Claude Vision how to score images — took longer to get right than all four agent functions combined. Generic prompts produce generic output. Specific examples in the prompt produce consultant-quality findings.

**Graceful degradation is a design decision, not an afterthought.** Building every agent to return `null` on failure rather than throwing meant the pipeline was resilient from the start. It also forced clearer thinking about what the product should do when information is missing — which improved the synthesis prompt significantly.

**SSE + Fluid Compute is the right pattern for long AI pipelines on Vercel.** The first version used standard serverless functions and hit the 10-second timeout on every real run. Edge Runtime + SSE + the first event firing within 1 second solved it completely and created the live agent dashboard as a side effect.

---

## What's next

- Improve synthesis prompt specificity across more product categories
- Add a webhook so sellers can schedule weekly listing health checks
- Extend the shareable score card to work as an embeddable widget for seller communities
- Fine-tune the visual rubric against validated conversion data

---

## About

Built by **NIKHIL RAJ** — [LinkedIn](https://linkedin.com/in/nikhilraj-dev) · [GitHub](https://github.com/nikhiilraj)

Built as a submission project for [Pixii.ai](https://pixii.ai) — a platform that designs Amazon listings instantly using AI. ListingLens is a companion diagnostic tool that identifies what needs to be fixed before Pixii designs it.