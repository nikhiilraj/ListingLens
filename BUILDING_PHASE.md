# ListingLens — Build Phases

The complete build plan, divided into 14 testable phases. Each phase has a scoped deliverable, a boundary, a test that proves completion, and an estimated time.

**Total estimated build time: ~14 hours** (with buffer for debugging).

---

## How to use this document

1. **Work on one phase at a time.** Tell the agent "Build Phase X" and link this doc.
2. **Do not skip ahead.** Each phase depends on the previous. Skipping creates ghost dependencies.
3. **Run the test after every phase.** If the test fails, fix it before moving on. Bugs compound.
4. **Use DEV_MODE for phases 5–9.** Real API calls happen in phase 10 onwards.
5. **Commit after every phase.** `git commit -m "Phase X: <deliverable>"`. Each phase is a checkpoint you can roll back to.

---

## Phase boundary rules — these apply to every phase

- **Stay inside the listed scope.** Do not edit files outside the "files touched" list.
- **Do not pre-build.** If Phase 7 needs a component that fits naturally in Phase 6, build the minimal version in Phase 6 and expand in Phase 7.
- **Run the test.** Do not declare a phase complete without running its test.
- **Update changelog.** One line in `docs/changelog.md` per phase.

---

# DAY 1 — Foundation and Agents

## Phase 1 — Project scaffold and deployment

**Goal:** Get a "Hello ListingLens" page deployed live on Vercel with all environment variables configured.

**Time estimate:** 45 minutes.

**Files touched:**
- `package.json`
- `next.config.js`
- `tailwind.config.ts`
- `app/layout.tsx`
- `app/page.tsx` (placeholder only)
- `app/globals.css`
- `.env.local`
- `.env.example`

**Tasks:**
1. Initialize Next.js 15 with App Router, TypeScript, Tailwind v4: `npx create-next-app@latest listinglens --typescript --tailwind --app --no-src-dir`
2. Install core dependencies in one command:
   ```
   npm install ai @ai-sdk/anthropic @ai-sdk/google @upstash/redis @upstash/ratelimit zod nanoid
   ```
3. Create `.env.example` with all keys empty; create `.env.local` and fill it from your stored credentials.
4. Configure Tailwind with the design system colours from `docs/design-prompt.md`:
   ```
   --color-bg: #fafaf9
   --color-surface: #f5f4f2
   --color-border: #e8e6e2
   --color-text: #111110
   --color-text-secondary: #6b6a67
   --color-text-tertiary: #a8a7a3
   --color-accent: #1a1a1a
   ```
5. Add Geist + Geist Mono via `next/font`.
6. Build a placeholder `app/page.tsx` with the wordmark and the words "ListingLens — coming soon" centred.
7. Initialize git, push to GitHub.
8. Connect to Vercel, deploy, **enable Fluid Compute in project settings**.
9. Add all environment variables to Vercel.

**Test that proves completion:**
- The deployed URL loads in under 1 second
- Geist font renders correctly (not fallback)
- Lighthouse score ≥ 95 for performance
- Fluid Compute is visibly enabled in Vercel dashboard

**Boundary — do NOT build:** the URL input form, agents, components beyond the placeholder, or any API routes.

---

## Phase 2 — Core utilities and Redis

**Goal:** Build the foundational utilities every other phase depends on. ASIN extraction, image proxy, Redis client, dev mode toggle.

**Time estimate:** 1 hour.

**Files touched:**
- `lib/extract-asin.ts`
- `lib/image-utils.ts`
- `lib/redis.ts`
- `lib/dev-mode.ts`
- `app/api/proxy-image/route.ts`

**Tasks:**

1. **`lib/extract-asin.ts`** — exports `extractAsin(url: string): string | null`. Regex: `/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i`. Validates the URL is `amazon.com`, `amazon.in`, etc.

2. **`lib/dev-mode.ts`** — exports `isDevMode(): boolean` reading `process.env.DEV_MODE === 'true'`. Single source of truth.

3. **`lib/redis.ts`** — exports a configured Upstash Redis client and a rate limiter factory. Use prefix-namespaced keys: `result:`, `cache:asin:`, `ratelimit:ip:`.

4. **`lib/image-utils.ts`** — exports `fetchImageAsBase64(url: string): Promise<{base64: string, mimeType: string}>`. Server-side fetch with browser User-Agent. 10-second timeout. Throws on failure (caller handles).

5. **`app/api/proxy-image/route.ts`** — Edge runtime. Takes `?url=` query param, returns the image bytes with correct Content-Type. Used only by the report UI for displaying competitor images, not for Claude Vision (Vision uses base64 inline).

**Test that proves completion:**
- Open a Node REPL or test file:
  ```typescript
  import { extractAsin } from './lib/extract-asin';
  console.log(extractAsin('https://www.amazon.com/dp/B0CHX1W1XY')); // 'B0CHX1W1XY'
  console.log(extractAsin('https://google.com')); // null
  ```
- `curl http://localhost:3000/api/proxy-image?url=<any-image-url>` returns the image bytes.
- `redis.set('test', 'hello')` then `redis.get('test')` returns `'hello'`.

**Boundary — do NOT build:** any agent, any prompt, any UI.

---

## Phase 3 — API client wrappers

**Goal:** Build the four external API clients. Each is a pure module with one or two exported functions. No agent logic.

**Time estimate:** 1.5 hours.

**Files touched:**
- `lib/apis/anthropic.ts`
- `lib/apis/gemini.ts`
- `lib/apis/serpapi.ts`
- `lib/apis/firecrawl.ts`

**Tasks:**

1. **`lib/apis/anthropic.ts`** — exports a configured Anthropic provider from `@ai-sdk/anthropic`. Default model: `claude-sonnet-4-6`.

2. **`lib/apis/gemini.ts`** — exports a configured Google provider from `@ai-sdk/google`. Default model: `gemini-2.5-flash`.

3. **`lib/apis/serpapi.ts`** — exports two functions:
   - `getAmazonProduct(asin: string)`: calls SerpAPI with `engine=amazon_product`. Returns typed `ProductData` (defined in this file using Zod). Includes title, brand, images[], price, rating, review_count, bullet_points, category.
   - `searchAmazon(keyword: string, limit: number = 5)`: returns top N ASINs for a keyword.
   - Both have 15-second timeouts. Both return `null` on failure (never throw).

4. **`lib/apis/firecrawl.ts`** — exports `scrapeReviews(asin: string)`: calls Firecrawl on the reviews URL with an extraction schema for review text. 8-second timeout. Returns `ReviewData[] | null`. Returns null on any failure.

**Test that proves completion:**
- Write a one-off script `scripts/test-apis.ts`:
  ```typescript
  const product = await getAmazonProduct('B0CHX1W1XY');
  console.log(product?.title); // some real product title
  
  const competitors = await searchAmazon('magnesium glycinate', 5);
  console.log(competitors); // array of 5 ASINs
  ```
- Both calls return real data.
- Burns ~2 SerpAPI credits — acceptable.

**Boundary — do NOT build:** Anthropic prompts, agent files, or schemas beyond what `getAmazonProduct` needs.

---

## Phase 4 — Zod schemas

**Goal:** Define every Zod schema the agents will use. Centralized, named, exported. This is what makes the rest of the build type-safe and reliable.

**Time estimate:** 1 hour.

**Files touched:**
- `lib/schemas/product.ts`
- `lib/schemas/visual.ts`
- `lib/schemas/review.ts`
- `lib/schemas/search.ts`
- `lib/schemas/benchmark.ts`
- `lib/schemas/report.ts`

**Tasks:**

1. **`product.ts`** — `ProductSchema`: the SerpAPI return shape (already defined in Phase 3, just move it here).

2. **`visual.ts`** — `VisualAuditSchema`:
   ```typescript
   {
     overallScore: number (0-100),
     verdict: string,
     images: Array<{
       index: number,
       score: number,
       failures: Array<{lever: string, severity: 'critical'|'major'|'minor', description: string, fix: string}>
     }>,
     topFailures: Array<{title: string, description: string, fix: string}> // top 3 across all images
   }
   ```

3. **`review.ts`** — `ReviewIntelligenceSchema`:
   ```typescript
   {
     available: boolean,
     purchaseTriggers: string[],
     complaints: string[],
     unspokenFeatures: string[], // mentioned in reviews, missing from images
     emotionalDrivers: string[]
   }
   ```

4. **`search.ts`** — `AISearchSchema`:
   ```typescript
   {
     queries: Array<{question: string, claudeFound: boolean, geminiFound: boolean}>,
     visibilityScore: number (0-100),
     missingKeywords: string[]
   }
   ```

5. **`benchmark.ts`** — `BenchmarkSchema`:
   ```typescript
   {
     competitorCount: number,
     visualStrategies: Array<{asin: string, strategy: string, hookLine: string}>,
     gapAnalysis: string,
     opening: string // the white space the user can occupy
   }
   ```

6. **`report.ts`** — `ReportSchema`: the final synthesis output, including the Pixii brief structure:
   ```typescript
   {
     overallScore: number,
     grade: 'A'|'B'|'C'|'D'|'F',
     verdict: string,
     biggestLeak: {imageIndex: number, description: string, prescription: string},
     pixiiBrief: {
       productCategory: string,
       targetCustomer: string,
       visualDirection: string,
       heroRecommendation: string,
       infographicPriorities: string[],
       trustSignals: string[],
       mobileNotes: string,
       searchKeywords: string[],
       competitorOpening: string
     }
   }
   ```

**Test that proves completion:**
- All 6 files import without errors
- A quick check: `VisualAuditSchema.safeParse({...mock data...}).success === true`
- TypeScript compiles with zero errors

**Boundary — do NOT build:** any prompt, any agent, any UI.

---

## Phase 5 — Fixtures and dev mode setup

**Goal:** Create realistic fixture data so phases 6–9 can build agents without burning a single API credit. Fixtures are pre-saved JSON for 3 real Amazon listings.

**Time estimate:** 1 hour.

**Files touched:**
- `lib/fixtures/products/B0CHX1W1XY.json` (and 2 more real ASINs)
- `lib/fixtures/reviews/B0CHX1W1XY.json` (and 2 more)
- `lib/fixtures/visual-audit.json` — sample VisualAuditSchema-compliant output
- `lib/fixtures/review-intelligence.json` — sample ReviewIntelligenceSchema output
- `lib/fixtures/ai-search.json`
- `lib/fixtures/benchmark.json`
- `lib/fixtures/report.json`
- `lib/fixtures/index.ts` — central exports

**Tasks:**

1. Pick 3 real ASINs from different categories (e.g. supplement, kitchen, electronics).
2. Run the SerpAPI client from Phase 3 once for each — save the output as JSON.
3. Run Firecrawl once for each — if it works, save output. If not, hand-craft a realistic review JSON.
4. Hand-craft sample outputs for each agent schema. These will be used during agent development.
5. `lib/fixtures/index.ts` exports helper functions: `getFixtureProduct(asin)`, `getFixtureReviews(asin)`, etc.

**Test that proves completion:**
- All fixture JSON files validate against their corresponding Zod schemas
- `getFixtureProduct('B0CHX1W1XY')` returns the saved data

**Boundary — do NOT build:** any agent, any UI, any prompt.

---

## Phase 6 — Visual rubric prompt + Agent 1 (Visual Auditor)

**Goal:** Build the most important agent first. The visual rubric prompt is the soul of the entire product. Spend a disproportionate amount of time here.

**Time estimate:** 2 hours.

**Files touched:**
- `lib/prompts/visual-rubric.ts`
- `lib/agents/visual-auditor.ts`

**Tasks:**

1. **`lib/prompts/visual-rubric.ts`** — exports `VISUAL_RUBRIC_PROMPT` as a string constant. The prompt covers:
   - Persona: "You are a senior Amazon CRO consultant who has audited 10,000+ listings"
   - Context: the product category, brand, price range
   - The 12 CRO levers, each with a 1-line definition AND 1 concrete failure example
   - Output requirement: "Return only data matching the schema. Do not write explanatory text."
   - Specificity demand: "Every failure must reference what specifically is wrong. 'Too much text' is rejected. '11 words on a small font, unreadable on mobile' is accepted."

2. **`lib/agents/visual-auditor.ts`** — exports `runVisualAuditor(product, stream)`:
   - If `isDevMode()`: stream a few status messages with realistic timing, then return fixture data.
   - Otherwise: fetch all images via `fetchImageAsBase64`, send to Claude Vision via `generateObject` with `VisualAuditSchema`, stream status messages between calls.
   - Wrap the entire body in try/catch. On failure: stream `{status: 'failed'}` and return null.

3. **Iterate the prompt against 3 real listings.** Run the agent in non-dev mode against your 3 fixture ASINs. Tune the prompt until the output is sharp, specific, and useful — not generic.

**Test that proves completion:**
- In dev mode: `runVisualAuditor(product, mockStream)` returns the fixture in <500ms with streamed status updates.
- In real mode against a fixture ASIN: returns a valid `VisualAuditSchema` object with at least 3 specific failure callouts that pass this bar: "would a real CRO consultant agree with this finding?"
- Burns ~$0.10-$0.20 in Claude credits per real run.

**Boundary — do NOT build:** other agents, the streaming dashboard, the report UI.

**This phase is the highest-leverage phase in the entire build.** If the rubric is generic, every downstream output will be generic. Spend extra time here.

---

## Phase 7 — Agents 3 + 4 (AI Search + Benchmarker)

**Goal:** Build the two most reliable agents. These have no scraping risk, run fully on first-party APIs.

**Time estimate:** 1.5 hours.

**Files touched:**
- `lib/prompts/search-queries.ts`
- `lib/prompts/benchmark.ts`
- `lib/agents/ai-search.ts`
- `lib/agents/category-benchmarker.ts`

**Tasks:**

1. **`lib/prompts/search-queries.ts`** — exports `GENERATE_QUERIES_PROMPT` (generates 6 realistic shopper questions for a product) and `CHECK_VISIBILITY_PROMPT` (checks if a brand appears in an LLM's response).

2. **`lib/agents/ai-search.ts`** — `runAISearchAuditor(product, stream)`:
   - Generate 6 queries via Claude (one call).
   - For each query, run two parallel calls: one to Claude, one to Gemini, asking "what are the top products for this query?"
   - Use string match + fuzzy match (Levenshtein) on the brand name to detect visibility.
   - Aggregate into `AISearchSchema`.
   - Dev mode: return fixture.

3. **`lib/prompts/benchmark.ts`** — exports `BENCHMARK_PROMPT`. Given the user's hero image and 5 competitor hero images, classify each competitor's visual strategy and identify the gap.

4. **`lib/agents/category-benchmarker.ts`** — `runCategoryBenchmarker(product, stream)`:
   - Extract primary keyword from product title (use Claude with a tiny prompt or simple heuristic).
   - `searchAmazon(keyword, 5)` to get 5 competitor ASINs.
   - Parallel `getAmazonProduct(asin)` for each.
   - Fetch all hero images as base64.
   - Single Claude Vision call with user's hero + 5 competitor heroes + the benchmark prompt.
   - Return `BenchmarkSchema`.
   - Dev mode: return fixture.

**Test that proves completion:**
- Both agents run end-to-end in dev mode and return fixtures.
- Both agents run in real mode against a fixture ASIN and return valid schema-compliant objects.
- The AI search agent's output identifies at least 2 queries where the product is missing from results.
- The benchmarker agent's output names at least 2 competitor ASINs and describes their visual strategies in concrete terms.

**Boundary — do NOT build:** Agent 2 (reviews), the dashboard, the report.

---

## Phase 8 — Agent 2 (Review Intelligence) with graceful fallback

**Goal:** Build the most fragile agent with bulletproof fallback. The agent must work cleanly whether Firecrawl succeeds or fails.

**Time estimate:** 1.25 hours.

**Files touched:**
- `lib/prompts/review-extraction.ts`
- `lib/agents/review-intelligence.ts`

**Tasks:**

1. **`lib/prompts/review-extraction.ts`** — exports `REVIEW_EXTRACTION_PROMPT`. Given an array of review texts, extract: purchase triggers, complaints, unspoken features (things customers care about that aren't in the listing images).

2. **`lib/agents/review-intelligence.ts`** — `runReviewIntelligence(product, stream)`:
   - Try `scrapeReviews(asin)` with 8-second timeout.
   - If returns >= 5 reviews: proceed.
   - If fails or returns < 5: try `getFixtureReviews(asin)`. If a fixture exists, use it. Otherwise return `{available: false, reason: 'Reviews not available for this listing'}`.
   - Run Claude with `REVIEW_EXTRACTION_PROMPT` and `generateObject` against `ReviewIntelligenceSchema`.
   - Stream status messages: "Fetching reviews..." "Extracting purchase triggers..." "Identifying image gaps..."
   - Dev mode: return fixture.

**Test that proves completion:**
- In dev mode: returns fixture quickly.
- In real mode against a Firecrawl-friendly ASIN: returns extracted intelligence with at least 3 purchase triggers and 2 complaints.
- In real mode against a Firecrawl-blocked ASIN: gracefully falls back to fixture or `{available: false}` without crashing.

**Boundary — do NOT build:** the synthesis agent, the dashboard, the report.

---

## Phase 9 — Synthesis agent + Pixii brief

**Goal:** Build the agent that turns four raw outputs into one coherent report and a structured Pixii brief. This is the agent the founders will judge most harshly.

**Time estimate:** 1.5 hours.

**Files touched:**
- `lib/prompts/synthesis.ts`
- `lib/agents/synthesis.ts`

**Tasks:**

1. **`lib/prompts/synthesis.ts`** — exports `SYNTHESIS_PROMPT`. The prompt explicitly handles missing agent outputs: "If review_intelligence is null, do not reference reviews in the synthesis." It must:
   - Cross-reference findings ("Agent 2 found X. Agent 4 found Y. Combined: Z.")
   - Compute a weighted overall score with explicit weights stated (e.g. visual 50%, reviews 20%, search 15%, benchmark 15%, recompute when an agent is missing).
   - Generate the **biggest leak** — the single most impactful failure with a written prescription.
   - Generate the **Pixii brief** — every field must be specific to this product, not generic.
   - Output language: confident, specific, no AI-speak. Like a senior consultant briefing.

2. **`lib/agents/synthesis.ts`** — `runSynthesis(visualResult, reviewResult, searchResult, benchmarkResult, stream)`:
   - Build the input by stripping nulls and including only what's available.
   - Single `generateObject` call with `ReportSchema`.
   - Stream status: "Synthesising findings across all agents..." then "Generating your Pixii brief..."
   - Dev mode: return fixture.

3. **Iterate this prompt 3–5 times.** Run it against the fixture data. Adjust until the Pixii brief feels like something a $500/hr consultant would write — every field references actual findings from the agents, never falls into "consider improving your visual strategy" territory.

**Test that proves completion:**
- In dev mode: returns fixture quickly.
- In real mode against fixture data: produces a `ReportSchema` where every Pixii brief field references at least one specific agent finding.
- A human reading the brief without seeing the agent outputs should still find it actionable and specific.

**Boundary — do NOT build:** the dashboard, the report UI, the API route.

---

# DAY 2 — Pipeline, UI, and Polish

## Phase 10 — The streaming pipeline (`/api/analyse`)

**Goal:** Wire all five agents into a single SSE-streamed pipeline. This is the spine of the app.

**Time estimate:** 1.5 hours.

**Files touched:**
- `app/api/analyse/route.ts`

**Tasks:**

1. Edge runtime: `export const runtime = 'edge'; export const maxDuration = 60;`
2. POST handler:
   - Parse body: `{ url: string }`
   - Extract ASIN. If null: return 400 with `{error: 'Invalid Amazon URL'}`.
   - Rate limit check via Upstash. Block if exceeded with 429.
   - **Cache check**: `redis.get('cache:asin:' + asin)`. If hit and < 24h old: stream cached result and exit.
   - Fetch product data via `getAmazonProduct(asin)`. If null: return 500 with clear error.
   - Use AI SDK 6 `createDataStreamResponse`:
     - Send first event within 1s: `{type: 'product', data: productData}`.
     - Run all 4 agents with `Promise.allSettled`, each agent gets the stream writer.
     - After all complete, run `runSynthesis` with whatever results came back (some may be null).
     - Generate result ID with nanoid.
     - Save to Redis: `result:{id}` (30-day TTL) and `cache:asin:{asin}` (24h TTL).
     - Final event: `{type: 'complete', id: '<id>'}`.
3. Wrap the entire body in try/catch. On unhandled error: send `{type: 'error', message: 'Something went wrong'}` and close.

**Test that proves completion:**
- `curl -X POST localhost:3000/api/analyse -H "Content-Type: application/json" -d '{"url":"https://amazon.com/dp/<fixture-asin>"}'` streams events for 30-90 seconds and ends with a `complete` event.
- The result ID is fetchable via `redis.get('result:' + id)`.
- Re-running the same URL within an hour returns the cached result in <1 second.
- An invalid URL returns 400 instantly.

**Boundary — do NOT build:** any UI yet. This is API-only.

---

## Phase 11 — Hero + URL input + Agent dashboard UI

**Goal:** Build the user-facing interaction layer that streams the live agent progress.

**Time estimate:** 2 hours.

**Files touched:**
- `app/page.tsx`
- `components/hero/UrlInput.tsx`
- `components/dashboard/AgentDashboard.tsx`
- `components/dashboard/AgentCard.tsx`
- `lib/use-analyse.ts` — custom hook that wraps the SSE consumer

**Tasks:**

1. **`lib/use-analyse.ts`** — custom hook using AI SDK 6's `useDataStream` or a manual `EventSource` consumer. Manages state: `idle | running | complete | error`, agent statuses, and the final result.

2. **`UrlInput.tsx`** — the hero component. Single input + button. Validation. Calls the hook on submit. Pixii-grade design (refer to design prompt for exact specs).

3. **`AgentCard.tsx`** — one card with three states: waiting, running (with streaming text + pulsing dot), complete (with checkmark + summary). Use mono font for streaming text.

4. **`AgentDashboard.tsx`** — orchestrates the four cards. Hidden until `running` state. Slides in from below with stagger. Shows the synthesis status line under the cards.

5. **`app/page.tsx`** — composition: hero → dashboard → (placeholder for report in next phase).

**Test that proves completion:**
- Paste a real Amazon URL on the deployed site
- Within 5 seconds: dashboard appears, agents start streaming
- Within 90 seconds: all 4 agents complete (or one fails gracefully)
- Streaming text feels alive — characters appear progressively, not all at once
- Mobile (375px wide): everything stacks correctly, no horizontal scroll
- Slow 3G: still feels responsive (status updates within seconds)

**Boundary — do NOT build:** the report rendering, the score card, the Pixii brief UI.

---

## Phase 12 — Report rendering

**Goal:** Render the full synthesised report below the dashboard. Score, image breakdown, before/after frame, AI search results, competitor comparison, Pixii brief.

**Time estimate:** 2 hours.

**Files touched:**
- `components/report/Report.tsx` (composition root)
- `components/report/Score.tsx`
- `components/report/ImageBreakdown.tsx`
- `components/report/BeforeAfter.tsx`
- `components/report/AISearchSection.tsx`
- `components/report/BenchmarkSection.tsx`
- `components/report/PixiiBrief.tsx`

**Tasks:**

1. **`Score.tsx`** — large number with count-up animation, dynamic colour by tier, one-line verdict, score breakdown bar with 4 segments.

2. **`ImageBreakdown.tsx`** — list of images with thumbnail, individual score, top 2 failures with red-dot bullets and fix instructions.

3. **`BeforeAfter.tsx`** — the dramatic two-column "biggest leak" panel. Image with red dashed callout on left, written prescription on right.

4. **`AISearchSection.tsx`** — list of 6 queries with pass/fail per LLM. One-paragraph explanation of what's missing.

5. **`BenchmarkSection.tsx`** — user's hero vs competitor heroes, gap analysis paragraph, "the opening" callout.

6. **`PixiiBrief.tsx`** — structured card with labelled fields. Two buttons: "Copy brief" (clipboard) and "Open Pixii →" (link).

7. **`Report.tsx`** — composes all sections with stagger entrance (80ms per section). Hides sections cleanly when their underlying agent returned null.

**Test that proves completion:**
- Full pipeline runs end-to-end in production
- Every report section renders with real data
- Sections gracefully hide when their agent failed (e.g. if Agent 2 fell through, no Reviews section appears)
- Copy brief button copies to clipboard and shows "Copied" for 2 seconds
- Mobile: every section reflows correctly
- Lighthouse accessibility score ≥ 95

**Boundary — do NOT build:** the score card PNG, the shareable results page, extra pages.

---

## Phase 13 — Score card PNG + Shareable results page + Caching

**Goal:** Make every analysis shareable via permanent URL and downloadable score card. This is the distribution mechanic.

**Time estimate:** 1.5 hours.

**Files touched:**
- `app/api/og/[id]/route.tsx`
- `app/results/[id]/page.tsx`
- `app/api/results/[id]/route.ts`
- `components/report/ScoreCard.tsx`
- Update `app/page.tsx` to redirect to `/results/[id]` on completion

**Tasks:**

1. **`app/api/og/[id]/route.tsx`** — uses `@vercel/og` and `ImageResponse`. Renders the score card as a PNG: product thumbnail, ListingLens wordmark, score, top 3 failures, "Get this fixed with Pixii →" CTA. Pulls the result from Redis.

2. **`app/api/results/[id]/route.ts`** — GET handler that reads from Redis, returns the report JSON. Handles missing/expired with a 404.

3. **`app/results/[id]/page.tsx`** — server component that fetches the result, renders the same Report component used on the homepage. Adds the score card at the top with download button and Pixii grader link below the report.

4. **`ScoreCard.tsx`** — the component used both on the page (HTML version) and in the OG route (rendered server-side). Single source of truth.

5. Update `app/page.tsx`: on `complete`, navigate to `/results/<id>` using `router.push`. The user lands on the permanent URL automatically.

6. **The Pixii grader link** — at the bottom of the results page: "Compare against Pixii's official grader →" linking to `https://amazon-listing-grader.pixii.ai/?asin=<asin>`. This is your distribution gift to Pixii.

**Test that proves completion:**
- Run a real analysis, get redirected to `/results/<id>`
- The URL is shareable — opening it on a different device shows the same report
- `https://yourapp.vercel.app/api/og/<id>` returns a valid PNG
- The "Download score card" button downloads the PNG
- Re-running the same Amazon URL within 24h skips the agent pipeline and shows the cached result instantly
- The Pixii grader link works and pre-fills the ASIN

**Boundary — do NOT build:** how-it-works, built-with, changelog pages.

---

## Phase 14 — Extra pages + Polish + Final test

**Goal:** Build the supporting pages that make ListingLens look like a real product. Run the final readiness test.

**Time estimate:** 1.5 hours.

**Files touched:**
- `app/how-it-works/page.tsx`
- `app/built-with/page.tsx`
- `app/changelog/page.tsx`
- `components/Nav.tsx`
- `components/Footer.tsx`
- Polish: empty states, error states, mobile fixes

**Tasks:**

1. **`/how-it-works`** — technical transparency page. Architecture diagram (you can use a simple Mermaid block or hand-drawn). Each agent explained in 2 paragraphs. The synthesis layer explained. Why SSE over WebSockets.

2. **`/built-with`** — list of every tool with a one-line "why we chose this." Claude Vision over GPT-4V. SerpAPI over Rainforest. Vercel AI SDK 6 over LangChain. Geist over Inter. Concrete reasons per item.

3. **`/changelog`** — reverse chronological log. Auto-generate from git history if possible, otherwise hand-write 6-8 entries covering the build.

4. **`Nav.tsx`** — minimal top bar across all pages. Logo, three small links: How it works · Built with · Changelog.

5. **`Footer.tsx`** — single line: "ListingLens — built for Pixii · made by [your name with LinkedIn link]"

6. **Polish pass:**
   - Empty state when no analysis has been run
   - Error state for invalid URLs
   - Error state for "this listing could not be analysed"
   - Mobile audit on a real phone (not DevTools)
   - Lighthouse audit — fix any score below 90
   - Check OG image in social preview tools

7. **The final test** (from the architecture doc):
   - Live URL
   - Real Amazon listing (not a fixture)
   - Network throttled to Slow 3G
   - Within 5s: dashboard appears
   - Within 90s: full report visible
   - Permalink works on a separate device

**Test that proves completion:**
- All four pages load with no errors
- The final test passes
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on every page
- The OG image renders in WhatsApp / Twitter preview

**Boundary — this is the last phase. After this, you record the demo video.**

---

# Token-saving rules (use these every phase)

1. **Always start a fresh session per phase.** Long contexts are expensive and confused. Each phase fits comfortably in one session.
2. **Reference files with `@`** — `@lib/agents/visual-auditor.ts` is cheaper than asking the agent to find and read the file.
3. **Use `!` for shell commands** — `!npm test` is faster than asking the agent to run tests.
4. **Don't paste large files.** Reference them. The agent can read.
5. **Don't ask for explanations.** Ask for code. If you want to understand something afterwards, that's a separate question.
6. **If a phase is going wrong, stop and rewind.** `/rewind` or `/clear`. Polluted contexts produce worse code than fresh ones.
7. **Use Gemini Pro for: prompt engineering iteration, design polish, copy writing.** Use Claude Code for: agent logic, schemas, API integration, complex TypeScript.

---

# When something breaks

The 5 most likely failure modes during build, in order of probability:

1. **TypeScript error after refactor** — usually a stale import. Run `tsc --noEmit` to find it.
2. **SSE stream closes before all agents complete** — Edge Runtime issue. Check `maxDuration = 60` and that first byte fires within 1s.
3. **Claude returns malformed output** — schema is too loose or prompt is unclear. Tighten the Zod schema and add more examples to the prompt.
4. **Image proxy 403** — Amazon blocked the User-Agent. Update to a current Chrome UA string.
5. **Vercel deploy fails** — usually missing env var. Check the build log; the missing variable is named.

For any of these, **don't ask Claude to debug indefinitely.** Spend max 15 minutes on a stuck bug, then post the error here and we debug together.

---

# Definition of done

ListingLens is shipped when:
- ✅ The deployed site renders correctly on mobile and desktop
- ✅ A first-time user can paste a URL and see results within 90 seconds
- ✅ The shareable permalink works on a different device
- ✅ The score card PNG downloads and shows correct data
- ✅ The Pixii brief is specific enough that a real seller would call it useful
- ✅ All four supporting pages load with no errors
- ✅ The LinkedIn launch post is ready to publish

Anything beyond that is over-building. Stop, record the demo video, send the application.