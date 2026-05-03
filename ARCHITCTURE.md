# ListingLens — Production Architecture
*Designed for: shipping in 2 days, working under real load, not breaking on demo day*

---

## The mental model first

ListingLens is **not** a chatbot. It is a **one-shot agentic pipeline** triggered by a single user input (an Amazon URL), runs four parallel investigations, streams each agent's progress to the browser in real time, and produces a structured report. Every architectural decision below flows from that shape.

This means our patterns are different from a typical AI app:
- No multi-turn conversation history → no chat persistence layer needed
- No tool-calling loops → agents are bounded, deterministic, parallel  
- No human-in-the-loop → fully autonomous from URL to report
- Time-to-first-token must be under 5 seconds → the streaming dashboard is the experience

The risk profile is also different: each analysis is a single high-stakes execution. If anything fails halfway through, the entire user experience breaks. The architecture must be designed around **graceful degradation** — every component must have a defined behaviour when its dependency fails.

---

## Stack — final and verified

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Edge runtime support, SSE streaming, Vercel-native |
| Language | **TypeScript** | Type safety on Claude responses is non-negotiable |
| AI SDK | **Vercel AI SDK 6** | Native SSE streaming, `streamText`, parallel `generateObject`, Zod validation |
| LLM | **Claude Sonnet 4.6** for synthesis, **Claude Sonnet 4.6 with vision** for image analysis | Best price/quality for production at our volume |
| Secondary LLM | **Gemini 2.5 Flash** | Agent 3 cross-platform check + LLM fallback if Anthropic 429 |
| Streaming | **Server-Sent Events via AI SDK 6 data streams** | Standard, simple, browser-native |
| Hosting | **Vercel Hobby + Fluid Compute** | Free, 60s function duration with Fluid, scales to zero |
| State | **Upstash Redis** | Free tier 500K commands/month, native Vercel integration |
| Image proxy | **Next.js API route** | Server-side fetch → base64 → pass to Vision |
| Amazon data | **SerpAPI amazon_product** + **amazon_search** | Reliable, structured, no scraping |
| Optional scraping | **Firecrawl** | Reviews — degrades gracefully if blocked |
| Score card export | **@vercel/og (Satori + resvg)** | Server-side PNG rendering, no html2canvas issues |
| Validation | **Zod** | All Claude outputs validated against schemas |
| Deploy | **Vercel** (Fluid Compute enabled) | One command, free, Edge runtime |

**Total monthly cost: $0.** All services on free tier. Claude API runs on your $500 credits.

---

## High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Next.js client)                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Hero → URL input → /api/analyse SSE stream             │  │
│  │  Agent dashboard (4 cards) ← streamed status updates    │  │
│  │  Report renders progressively as agents complete        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ POST /api/analyse  (stream: SSE)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Vercel Edge / Fluid Compute Function                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  1. Validate URL → extract ASIN                         │  │
│  │  2. Fetch product data via SerpAPI (1 call)             │  │
│  │  3. Open SSE stream                                     │  │
│  │  4. Run 4 agents IN PARALLEL with Promise.allSettled    │  │
│  │  5. Stream status updates from each agent               │  │
│  │  6. Run synthesis agent on combined output              │  │
│  │  7. Save result to Upstash → return permalink           │  │
│  │  8. Close stream                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
            │            │            │            │
            ▼            ▼            ▼            ▼
       ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ Agent  │  │  Agent   │  │  Agent   │  │  Agent   │
       │ 1 Vis. │  │ 2 Reviews│  │ 3 AI     │  │ 4 Bench. │
       │        │  │          │  │   Search │  │          │
       └───┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
           │            │             │             │
       ┌───▼────────────▼─────────────▼─────────────▼────┐
       │  External APIs                                  │
       │  Anthropic (Claude Vision + text)               │
       │  SerpAPI (Amazon search + product)              │
       │  Firecrawl (reviews — optional)                 │
       │  Gemini (cross-platform AI search check)        │
       └─────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  Upstash Redis   │
                  │  results:abc123  │
                  │  (TTL: 30 days)  │
                  └──────────────────┘
```

---

## The critical path — what happens from URL paste to final report

### Step 1: Validate and extract (client-side, ~10ms)
- Regex extracts ASIN from URL: `/\/dp\/([A-Z0-9]{10})/i`
- If no match: inline error, never call the API
- If valid: call `/api/analyse` with POST, body `{ asin, url }`

### Step 2: Open SSE stream (server, ~200ms to first byte)
- API route uses Vercel AI SDK 6 `createDataStreamResponse`
- Sends first event within 1 second to satisfy Edge Runtime streaming requirements
- First event: `{ type: "status", message: "Fetching listing data..." }`

### Step 3: Fetch listing data (server, 1–2 seconds)
- One SerpAPI call: `engine=amazon_product&asin=XXX`
- Returns: title, brand, images[], price, rating, review_count, bullet_points, category
- This is the **only blocking call** before agents start
- Why blocking: agents need product data to know what to analyse
- Failure mode: if SerpAPI fails, retry once, then fail with clear user message — do not partially proceed

### Step 4: Launch 4 agents in parallel
```typescript
const [visualResult, reviewResult, aiSearchResult, benchResult] = 
  await Promise.allSettled([
    runVisualAuditor(productData, stream),
    runReviewIntelligence(productData, stream),
    runAISearchAuditor(productData, stream),
    runCategoryBenchmarker(productData, stream),
  ]);
```
- `Promise.allSettled` — not `Promise.all` — so one failure does not abort others
- Each agent owns its own status stream events
- Total wall time: ~30–60 seconds (limited by slowest agent, not sum)

### Step 5: Synthesis (server, ~5 seconds)
- Combines all agent outputs into one Claude call
- Cross-references findings ("Agent 2 said X, Agent 4 said Y, therefore Z")
- Generates the structured Pixii brief
- Streams the synthesis output token-by-token to the client

### Step 6: Persist (server, ~50ms)
- `redis.set("results:" + nanoid(), JSON.stringify(result), { ex: 60*60*24*30 })`
- Returns the permalink to the client
- Last SSE event: `{ type: "complete", id: "abc123" }`

### Step 7: Client navigates / renders
- Final state already streamed; client just transitions to the completed view
- Permalink is shareable immediately

---

## Agent architecture — the deep dive

Each agent is a **pure function** with this signature:
```typescript
async function runAgent(
  product: ProductData,
  stream: DataStreamWriter
): Promise<AgentResult>
```

The `stream` lets the agent emit status updates the UI renders live. The return value goes into synthesis.

### Agent 1 — Visual Auditor (most critical)

**Inputs:** product images array (URLs from SerpAPI)
**Process:**
1. Stream: "Fetching images..."
2. **Image proxy step** — fetch each image server-side via `/api/proxy-image`, convert to base64. **This is the single most important production fix in the architecture.** Amazon CDN URLs may have referrer checks. Always proxy.
3. Stream: "Analysing image 1 of 7..." (per image)
4. Single Claude Vision call with all images (Claude supports up to 20 images per call) and the scoring rubric prompt
5. Output: Zod-validated JSON with per-image scores across 12 CRO levers + overall score + top failures
6. Stream: "Scored. 3 critical failures found."

**Failure modes:**
- Image fetch fails → mark that image as "could not load" but continue with remaining
- Claude Vision returns malformed JSON → strip markdown fences, retry parse, on second failure return null and let synthesis handle gracefully
- Claude 429 rate limit → exponential backoff with jitter, max 2 retries (8s, 24s)

### Agent 2 — Review Intelligence (most fragile)

**Inputs:** ASIN, product category
**Process:**
1. Stream: "Fetching reviews..."
2. **Try Firecrawl** for review URL with extraction schema
3. If Firecrawl returns < 5 reviews OR fails: **fall back to pre-cached fixture data** for the demo (5 popular ASINs pre-scraped during dev, stored in `/lib/fixtures/`)
4. Stream: "Extracting purchase triggers..."
5. Claude text call: extract purchase drivers, complaints, mentioned features
6. Output: structured review intelligence

**Failure modes:**
- Firecrawl timeout/block → fall back to fixtures (3-second timeout enforced)
- No matching fixture → return `{ available: false, reason: "Reviews not available for this listing" }` and let synthesis omit this section gracefully
- The frontend never crashes if this agent returns null

### Agent 3 — AI Search Visibility (most reliable)

**Inputs:** product title, brand, category
**Process:**
1. Stream: "Generating shopper questions..."
2. Claude generates 6 realistic shopper queries for the category
3. Stream: "Querying Claude..." then "Querying Gemini..."
4. **Two parallel calls** — one to Claude, one to Gemini, asking each "what are the top X products for Y query"
5. Check if user's brand name appears in either response (string match + fuzzy match)
6. Output: pass/fail for each query, what's missing from the listing that would help

**Failure modes:**
- Gemini fails → use only Claude results, note "single-platform analysis" in output
- Claude fails → use Gemini only with same note
- Both fail → skip this agent, synthesis omits this section

### Agent 4 — Category Benchmarker (most expensive, most impressive)

**Inputs:** product title, category, primary keyword (extract from title)
**Process:**
1. Stream: "Searching top competitors..."
2. SerpAPI `amazon_search` call with the primary keyword → top 10 ASINs
3. Take top 5 (cap to manage SerpAPI quota)
4. Stream: "Pulling competitor data..." 
5. **Parallel fetch** — 5 SerpAPI `amazon_product` calls for those ASINs
6. Stream: "Analysing visual strategies..."
7. Single Claude Vision call with the user's hero image + 5 competitor hero images, with the comparison prompt
8. Output: visual strategy classification per competitor + the gap analysis

**Failure modes:**
- SerpAPI search fails → skip Agent 4 entirely, synthesis omits it
- < 3 competitors with images → return `{ insufficient_data: true }`, synthesis notes limitation
- Vision call fails → degrade to text-only category analysis using product titles and bullets

### Synthesis Agent (the integration layer)

**Inputs:** all 4 agent outputs (some may be null)
**Process:**
1. Single Claude text call with structured prompt
2. The prompt explicitly handles missing agents: "If review_intelligence is null, do not reference reviews in the synthesis"
3. Cross-references findings across agents
4. Generates: overall score (weighted combination), one-line verdict, before/after prescription, **the Pixii design brief**
5. Streams output progressively (SSE deltas)

**This is the agent where prompt engineering matters most.** The synthesis prompt is what makes the output feel like a real consultant report instead of a list of analyses.

---

## The 5 production risks and how the architecture eliminates each

### Risk 1: Vercel function timeout (HIGH)
**Solution: Edge Runtime + Fluid Compute + SSE streaming**

```typescript
export const runtime = 'edge';                  // unlocks streaming
export const maxDuration = 60;                  // Fluid Compute on Hobby
```

The first SSE event must go out within 25 seconds. Ours fires within 1 second ("Fetching listing data..."). After that, the connection is held open for up to 300 seconds while agents run. **This single architectural choice eliminates the timeout risk completely.**

### Risk 2: Amazon image CDN blocks (HIGH)
**Solution: Server-side image proxy with base64 conversion**

```typescript
// /app/api/proxy-image/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 ...' }  // standard browser UA
  });
  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg' }
  });
}
```

For Claude Vision, we go further — fetch on the server, convert to base64, pass directly. Never pass Amazon URLs to Claude.

### Risk 3: Claude returns malformed JSON (MEDIUM)
**Solution: AI SDK 6 `generateObject` with Zod schemas**

```typescript
const result = await generateObject({
  model: anthropic('claude-sonnet-4-6'),
  schema: VisualAuditSchema,  // Zod schema — strict validation
  messages: [...],
  maxRetries: 2,
});
```

`generateObject` enforces structured output at the SDK level. If the model deviates, the SDK retries with a corrective message automatically. We never parse raw text. This is a 2026 best practice — it didn't exist a year ago.

### Risk 4: Claude rate limits during testing or demo (MEDIUM)
**Solution: Three-layer defense**

1. **Tier 1 starts at 50 RPM** — your $500 credits get you Tier 1 immediately. Our peak usage is ~6 calls per analysis. We can handle 8 concurrent analyses before hitting RPM limits. More than enough for a demo.
2. **Exponential backoff with jitter** — built into AI SDK by default
3. **Provider failover** — if Claude returns 429 sustained, Agent 3 already runs on Gemini. Visual analysis falls back to a text-only mode using product bullet points.

### Risk 5: Demo day — 50 people hit the site after the LinkedIn post (MEDIUM)
**Solution: Upstash Redis-backed rate limiting + caching**

- Rate limit per IP: 5 analyses per hour (using `@upstash/ratelimit`)
- **Cache by ASIN**: same ASIN analyzed twice within 24h returns the cached result. This is huge — when your video gets viewed, many people will paste the same demo ASIN. Cache hit = instant response = no API spend.
- This protects your Claude credits from abuse while making the demo experience faster for the 2nd–nth user.

---

## Data flow — what each storage layer holds

### Upstash Redis (single instance, prefix-namespaced)

```
results:{nanoid}      → JSON full report     TTL: 30 days
cache:asin:{asin}     → JSON cached result   TTL: 24 hours
ratelimit:ip:{ip}     → counter              TTL: 1 hour
```

That's it. No relational data. No user accounts. No sessions. The entire app's state fits in 4 keys per analysis. 500K commands/month free tier handles ~1000 analyses/day comfortably.

### No database needed

Persistent state is limited to results. Results are immutable once written. Redis with TTL is the right tool — and the cheapest. PostgreSQL or Supabase would be overkill and slower.

---

## File structure — the full project layout

```
listinglens/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                    # Landing — hero + URL input
│   │   ├── how-it-works/page.tsx       # Technical transparency page
│   │   ├── built-with/page.tsx         # Stack decisions
│   │   └── changelog/page.tsx          # Build log
│   │
│   ├── results/
│   │   └── [id]/page.tsx               # Shareable permalink page
│   │
│   ├── api/
│   │   ├── analyse/route.ts            # The main pipeline (SSE stream)
│   │   ├── proxy-image/route.ts        # Amazon CDN bypass
│   │   ├── og/[id]/route.tsx           # Score card PNG via @vercel/og
│   │   └── results/[id]/route.ts       # Fetch saved result
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── lib/
│   ├── agents/
│   │   ├── visual-auditor.ts           # Agent 1
│   │   ├── review-intelligence.ts      # Agent 2
│   │   ├── ai-search.ts                # Agent 3
│   │   ├── category-benchmarker.ts     # Agent 4
│   │   └── synthesis.ts                # Final integration
│   │
│   ├── apis/
│   │   ├── anthropic.ts                # Claude client wrapper
│   │   ├── gemini.ts                   # Gemini client wrapper
│   │   ├── serpapi.ts                  # SerpAPI client
│   │   └── firecrawl.ts                # Firecrawl client
│   │
│   ├── prompts/
│   │   ├── visual-rubric.ts            # The 12 CRO levers prompt
│   │   ├── review-extraction.ts
│   │   ├── search-queries.ts
│   │   ├── benchmark.ts
│   │   └── synthesis.ts                # The Pixii brief generator
│   │
│   ├── schemas/
│   │   ├── visual.ts                   # Zod schemas for Agent 1 output
│   │   ├── review.ts
│   │   ├── search.ts
│   │   ├── benchmark.ts
│   │   └── report.ts                   # Final report schema
│   │
│   ├── redis.ts                        # Upstash client + rate limiter
│   ├── image-utils.ts                  # Proxy fetch + base64 conversion
│   ├── extract-asin.ts                 # URL parsing
│   ├── fixtures/                       # Pre-cached review data for demo
│   │   ├── B0XXXX1.json
│   │   └── ...
│   └── dev-mode.ts                     # Mock responses for fast iteration
│
├── components/
│   ├── hero/UrlInput.tsx
│   ├── dashboard/AgentCard.tsx
│   ├── dashboard/AgentDashboard.tsx
│   ├── report/Score.tsx
│   ├── report/ImageBreakdown.tsx
│   ├── report/BeforeAfter.tsx
│   ├── report/PixiiBrief.tsx
│   └── report/ScoreCard.tsx
│
├── .env.local                          # API keys (never committed)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Environment variables (the complete list)

```bash
# AI providers
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...        # Gemini

# Data sources
SERPAPI_KEY=...
FIRECRAWL_API_KEY=...

# State
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Config
DEV_MODE=false                          # true during development to use fixtures
NEXT_PUBLIC_APP_URL=https://listinglens.vercel.app
```

---

## The one architectural pattern that ties everything together

**The "agent emits to stream, returns result" pattern.**

```typescript
// Every agent follows this exact shape
async function runAgent<T>(
  input: AgentInput,
  stream: DataStreamWriter,
  agentId: string
): Promise<T | null> {
  try {
    stream.writeData({ agent: agentId, status: 'running', message: 'Starting...' });
    
    // ... work happens here, with periodic stream updates ...
    stream.writeData({ agent: agentId, status: 'running', message: 'Halfway done...' });
    
    const result = await actualWork(input);
    
    stream.writeData({ agent: agentId, status: 'complete', summary: '...' });
    return result;
    
  } catch (err) {
    stream.writeData({ agent: agentId, status: 'failed', message: 'Could not complete' });
    return null;  // never throw — let the pipeline continue
  }
}
```

Every agent obeys this contract:
1. Streams its progress so the UI feels alive
2. Returns its result OR null
3. Never throws — failures degrade gracefully

This is what makes the architecture **resilient by design** — no single agent can break the whole pipeline.

---

## What I'm choosing NOT to build (and why)

| Skipped | Why |
|---|---|
| User authentication | Adds 1 day, zero demo value |
| PostgreSQL database | Redis is enough; sql adds complexity |
| Multi-region deploy | Single region is fine for a 2-day demo |
| Background job queue | Pipeline runs in 60s — synchronous is correct |
| Webhook delivery | No async outputs needed |
| Custom analytics | Vercel Analytics (free) is enough |
| Test suite | We're not shipping for paying customers — manual testing is the right tradeoff |
| TypeScript strict mode | We're moving fast — strict mode adds debugging time |
| Internationalization | English only, single market |
| Dark mode | The design is intentionally white-themed |

**Every "skip" is a deliberate decision, not laziness.** The answer to "should we add X?" for the next 2 days is "no, unless removing it breaks the user experience."

---

## Build order — what to ship in what sequence

### Day 1
1. **Hour 1** — Project scaffold, env vars, Vercel deploy with Hello World. Confirm Fluid Compute is on.
2. **Hour 2** — Image proxy route + ASIN extractor + SerpAPI client wrapper. Tested with curl.
3. **Hour 3** — Visual rubric prompt engineered against 5 real Amazon listings. **This is the highest-leverage hour of the entire build.**
4. **Hour 4** — Agent 1 (visual auditor) end-to-end with Zod validation.
5. **Hour 5** — SSE streaming setup using AI SDK 6 dataStream. Test with a single agent.
6. **Hour 6** — Agents 3 (AI search) and 4 (benchmarker) in parallel. These are the most reliable, build them next.

### Day 2
7. **Hour 7** — Agent 2 (reviews) with Firecrawl + fixture fallback.
8. **Hour 8** — Synthesis agent + Pixii brief generation.
9. **Hour 9** — Frontend wiring: agent dashboard, status streams, report rendering.
10. **Hour 10** — Score card via @vercel/og + shareable results page + Redis persistence.
11. **Hour 11** — Polish + edge cases + mobile responsiveness.
12. **Hour 12** — End-to-end testing with 3 different ASINs. Record demo video.

---

## The single test that proves the architecture works

Before recording the demo video, run this test:

1. Open the live site
2. Paste a real Amazon URL (one you have NOT pre-cached)
3. Throttle your network to "Slow 3G" in Chrome DevTools
4. Press analyse

Within 5 seconds you should see:
- Agent dashboard appears
- All 4 agents show "running" with streaming status text

Within 90 seconds you should see:
- All 4 agents complete (or one gracefully fail)
- Synthesis runs
- Report appears with all sections populated
- Permalink works on a separate device

**If this test passes on Slow 3G, it will pass for any of Pixii's founders.**

---

*This architecture is built for one job: not breaking when it matters most. Every component has a defined failure mode. Every dependency has a fallback. The end result is a tool that runs reliably under load, on a budget of zero dollars, using patterns that match how the best AI products are built in 2026.*