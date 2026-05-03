# CLAUDE.md — ListingLens

You are working on **ListingLens**, a one-shot agentic web app that audits Amazon listings using 4 parallel AI agents and produces a Pixii design brief. Built for a 2-day job application sprint. Production-grade. Free to run.

---

## What you must know before writing any code

**Read these files before starting:**
- `@docs/architecture.md` — the full production architecture
- `@docs/design-prompt.md` — the visual design system

**This is not a chatbot.** It is a bounded one-shot pipeline: user pastes Amazon URL → 4 agents run in parallel → synthesis agent integrates results → user gets a report. There is no chat history, no multi-turn state, no tool-calling loops. Every architectural decision flows from this shape.

**The single user input is one Amazon URL.** Everything else is autonomous.

---

## The non-negotiables

These rules override anything else. If you find yourself working around them, stop and re-read.

1. **Use the simplest possible approach.** Do not add abstractions, generic types, or speculative error handling. If we need it later, we'll add it later.
2. **Never throw inside an agent.** Agents return `Result | null`. Failure modes degrade gracefully. The pipeline must never crash because one agent failed.
3. **Never pass Amazon CDN URLs directly to Claude Vision.** Always proxy server-side, convert to base64, then pass.
4. **All Claude outputs use `generateObject` with Zod schemas.** Never parse raw text. Never trust the model to return clean JSON without schema enforcement.
5. **All external API calls live in `lib/apis/*`.** Components and routes never call APIs directly. This is non-negotiable for testability and dev mode.
6. **`DEV_MODE=true` in `.env.local` returns fixtures from `lib/fixtures/`.** Fast iteration without burning Claude credits. Always test agent code in dev mode first.
7. **The first SSE event must fire within 1 second.** Otherwise Vercel Edge Runtime drops the connection. Do not block on anything before opening the stream.
8. **One accent colour. White-themed. Never add a second.** See design prompt.

---

## Stack — fixed, no substitutions

```
Next.js 15 (App Router) + TypeScript
Vercel AI SDK 6 (streamText, generateObject, dataStream)
Anthropic Claude Sonnet 4.6 (vision + text)
Google Gemini 2.5 Flash (Agent 3 cross-platform check)
SerpAPI (amazon_search + amazon_product engines)
Firecrawl (Agent 2 reviews, with fixture fallback)
Upstash Redis (results, cache, rate limiting)
Tailwind CSS v4
Zod (schema validation everywhere)
@vercel/og (Satori for score card PNG generation)
Vercel Hobby + Fluid Compute + Edge Runtime
```

**Do not suggest alternatives.** No LangChain. No LangGraph. No VoltAgent. No Pinecone. No PostgreSQL. No Supabase. No NextAuth. We are not building any of those.

---

## File structure — do not deviate

```
app/
  page.tsx                  # Landing — hero + URL input
  how-it-works/page.tsx     # Technical transparency page
  built-with/page.tsx       # Stack rationale
  changelog/page.tsx        # Build log
  results/[id]/page.tsx     # Shareable permalink
  api/
    analyse/route.ts        # The main SSE pipeline
    proxy-image/route.ts    # Amazon CDN bypass
    og/[id]/route.tsx       # Score card PNG
    results/[id]/route.ts   # Fetch saved result

lib/
  agents/                   # One file per agent — pure functions
  apis/                     # All external API clients
  prompts/                  # All Claude prompts as exported constants
  schemas/                  # All Zod schemas
  fixtures/                 # Pre-cached data for DEV_MODE
  redis.ts
  image-utils.ts
  extract-asin.ts
  dev-mode.ts

components/
  hero/UrlInput.tsx
  dashboard/AgentCard.tsx
  dashboard/AgentDashboard.tsx
  report/*.tsx
```

---

## The agent contract — every agent obeys this exact shape

```typescript
async function runAgent<T>(
  input: AgentInput,
  stream: DataStreamWriter,
  agentId: 'visual' | 'review' | 'search' | 'benchmark'
): Promise<T | null> {
  try {
    stream.writeData({ agent: agentId, status: 'running', message: '...' });
    // work
    stream.writeData({ agent: agentId, status: 'complete', summary: '...' });
    return result;
  } catch (err) {
    stream.writeData({ agent: agentId, status: 'failed', message: 'Could not complete' });
    return null;
  }
}
```

**Streaming updates feel like real computation.** Use mono-style status messages: "Loading images..." "Sending to vision model..." "Found 3 critical failures." Not "Processing..." or "Please wait."

---

## Prompt engineering rules

1. **Every prompt lives in `lib/prompts/` as a named export.** Never inline prompts in agent files.
2. **Use `generateObject` with Zod, not `generateText` + JSON parsing.** AI SDK 6 enforces schema at the protocol level. We never wrap parsing in try/catch — the SDK handles that.
3. **Ground prompts in concrete examples.** Generic prompts produce generic output. The visual rubric prompt must include 2–3 concrete failure examples ("hero image with 11 words of text on a blurry background = mobile readability fail").
4. **The synthesis prompt is the most important prompt in the codebase.** It is what makes the report feel like a real consultant. Spend disproportionate time on this one.
5. **Never let Claude write copy that ends up in the UI without review.** All user-facing strings (headers, labels, CTAs) are hardcoded.

---

## Design rules — what makes ListingLens look premium

Refer to `@docs/design-prompt.md` for the full system. The compressed version:

- **Background:** `#fafaf9` (warm off-white). Never pure white.
- **Accent:** `#1a1a1a` (near black). One accent only.
- **Typography:** Geist + Geist Mono. Mono is used exclusively for streaming agent text and scores.
- **Layout:** single column, max-width 760px, centred. No sidebars, no horizontal splits.
- **Density:** 3/10. Spacious. Premium. Trust comes from breathing room.
- **Motion:** subtle. Staggered entry on load. Hover states on everything interactive. No scroll-driven effects.
- **No emojis, no exclamation marks, no AI clichés ("seamless", "powerful", "next-gen").**

---

## What you should not do

These are the failure modes I see most often. Avoid them.

- ❌ Don't add features I didn't ask for. If a section says "build the URL input," don't also build the agent dashboard.
- ❌ Don't refactor working code. If something works, leave it.
- ❌ Don't add tests. Manual testing is the right tradeoff for a 2-day sprint.
- ❌ Don't add error boundaries everywhere. Inline error states only at user-facing entry points.
- ❌ Don't use `any` or `unknown` to silence TypeScript. Fix the type properly or ask.
- ❌ Don't install new dependencies without confirming. Check `package.json` first.
- ❌ Don't write defensive code for problems that don't exist. Trust the schemas.
- ❌ Don't add comments that restate what the code does. Comments explain *why*, not *what*.
- ❌ Don't use `console.log`. Remove all of them before completing a step.

---

## Build phases

We are building this in **discrete, testable phases**. Each phase has:
- A scoped deliverable
- A test you must run before declaring the phase complete
- An explicit "do not touch outside this scope" boundary

**At the start of every phase, you will be told which phase number to work on.** Do not work on adjacent phases. Do not anticipate future phases. Build only what the current phase asks for.

The full phase plan lives in `@docs/build-phases.md`. Do not start work without reading the relevant phase first.

---

## How I want you to work

1. **Plan before coding.** For any non-trivial step, write a 3–5 line plan in chat first. I'll approve or correct it. Then implement.
2. **Show me the test before I ask.** After completing a phase, tell me exactly what command or interaction proves it works.
3. **If you're unsure, ask.** One clarifying question is cheaper than 200 lines of wrong code.
4. **When you finish a phase, update `docs/changelog.md`** with one line describing what shipped.
5. **At the end of every session, dump session learnings to `docs/session-notes.md`.** I'll review and decide what to keep.

---

## Environment — what's already configured

```bash
# .env.local will contain:
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
SERPAPI_KEY=
FIRECRAWL_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DEV_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Always check `process.env.DEV_MODE === 'true'` at the entry of every agent.** If true, return fixture data instead of calling the API.

---

## The test that proves we shipped something good

When the work is done, this flow must pass:

1. Open the deployed site
2. Paste a real Amazon listing URL
3. Throttle to Slow 3G in DevTools
4. Press analyse

Within 5 seconds: agent dashboard appears, all 4 cards show streaming status.
Within 90 seconds: synthesis runs, full report appears, permalink works on a separate device.

**If this test fails, we have not shipped. No matter how good the code looks.**