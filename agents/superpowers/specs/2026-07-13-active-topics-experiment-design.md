# Active Topics Experiment — Design

_Date: 2026-07-13 · Project: mailbox-research · Harness: `packages/stories/stories-brain`_

## Context

The Topics feature (product) now tags mail, clusters threads, and proposes opt-in suggestions
(PR #12178). The open research question is what a _fully-populated, high-value_ topic looks like and
how to tell a small number of genuinely **active** topics from the long tail. This experiment runs
over the private inbox fixture (git-ignored, local-only) to build rich topic structures and a
confidence-ranked active/suggested split, for morning human review. Its output `ActiveTopic` shape is
the proposal for evolving the product `Topic` schema.

It reuses the existing overnight harness: `scripts/overnight.mjs` (driver pattern),
`src/testing/harness/pipelines/*` (clustering via `@dxos/pipeline-email`, `facts`, `draft`,
`summarize`, `questions`, `classify-sender`, `threads`), `internal/{grade,ladder,fact-store}.ts`, the
`model-policy` map, and the `fixtures/local/results/` artifact convention.

## Goals

- Identify a **small number** (default 3–5) of **high-confidence active topics**.
- Build a **fully-populated structure** for each: related threads, status summary, facts, action
  items (as a plugin-outliner `Outline`), and draft responses.
- Produce a set of **lower-confidence suggested topics** (label + summary + counts only).
- Emit morning-reviewable artifacts; **success is human review** (no automated judge).

## Non-goals

- No automated LLM-judge scoring this round (human review is the eval).
- No product-plugin changes — this is harness-only research (though it informs the product `Topic`).
- No held-out incoming-mail contextualization eval (a later experiment; see `project_facts_as_memory`).

## The `ActiveTopic` structure (experiment-local)

```ts
type ActiveTopic = {
  // Cluster identity (reuses pipeline-email TopicProps fields).
  label: string;
  summary: string;
  threadIds: string[];
  participants: string[];
  keywords: string[];
  // Populated only for active topics:
  status: string; // current-status summary (LLM)
  facts: string[]; // salient facts (facts pipeline / fact-store)
  tasks: Outline.Outline; // plugin-outliner Outline; content Text is nested `- [ ]` markdown
  drafts: { threadId: string; draft: string }[]; // per replyable thread
  // Ranking:
  confidence: number; // 0..1 combined score
  rationale: string; // LLM one-line justification
  kind: 'active' | 'suggested';
};
```

An `Outline` is `{ name?, content: Ref(Text.Text) }` (see `plugin-outliner/types/Outline.ts`); its Text
holds the nested `- [ ]` task markdown, so a real ECHO `Outline` _is_ the task outline and is
constructible headlessly with `Outline.make({ name, content })`.

## Pipeline

Over the full fixture corpus (`loadFixtureMessages`), reusing `resolveModel(stage)` for model routing:

1. **Cluster** — `clusterThreads(buildThreads(messages))` → topic drafts.
2. **Activity score (deterministic)** — per cluster, combine normalized signals:
   - recency (max member-message `created`),
   - thread state `awaiting-mine` (from `buildThreads`),
   - person-linked (a participant is a known contact / `classify-sender` = person),
   - open-item count (rolled-up `openQuestions` / `actionItems`).
     Pure + unit-tested. Produces `activityScore ∈ [0,1]` and a candidate set (score ≥ prefilter floor).
3. **LLM confidence** — for each candidate, prompt for `{ confidence: 0..1, rationale }` ("is this an
   active topic that needs the owner's attention?"). Degrades to the deterministic score on failure.
4. **Combine + split** — `confidence = w·llm + (1−w)·activity` (default `w=0.6`); `kind = 'active'`
   when `confidence ≥ ACTIVE_THRESHOLD` (default 0.6), capped at `ACTIVE_TOP` (default 5); the rest are
   `'suggested'`.
5. **Populate active topics** — for each active topic:
   - **status** — LLM current-status summary of the topic's threads.
   - **facts** — run the facts pipeline over the topic's messages (reuse `pipelines/facts.ts` +
     `fact-store`); collect salient facts.
   - **tasks** — extract action items (from threads' `actionItems` + an LLM pass over the messages),
     render as nested `- [ ]` markdown, wrap in `Outline.make({ name: '<label> — tasks', content })`.
   - **drafts** — for each replyable thread (`Mailbox.isReplyable` person-only, `awaiting-mine`), run
     `pipelines/draft.ts` to produce a draft reply.
6. **Suggested topics** — label + summary + counts + confidence/rationale only (not populated).

## Artifacts (`fixtures/local/results/active-topics/`)

- `index.md` — a table of active + suggested topics: label, kind, confidence, rationale, and a
  populated-field checklist (status/facts/tasks/drafts ✓/✗) so gaps are obvious at a glance.
- `<topic-slug>.md` — one per active topic: status summary · related threads (subjects + participants)
  · action-items outline · facts · draft responses.
- `active-topics.json` — serialized `ActiveTopic[]` (including each `Outline`'s Text content) for
  inspection and potential import into a space.

## Driver

`scripts/active-topics.mjs` + a `stories-brain:active-topics` moon task, mirroring `overnight.mjs`:
non-interactive, tees logs, writes the reports. Env knobs (defaults apply only when unset):

- `ACTIVE_N` — max candidates scored by the LLM (default 20).
- `ACTIVE_TOP` — max fully-populated active topics (default 5).
- `ACTIVE_THRESHOLD` — active/suggested confidence cutoff (default 0.6).
- `MODEL_POLICY` — per-stage model overrides (else the default policy).

Prereqs (same as `overnight`): Ollama up with the ladder pulled; `.env` rendered
(`moon run stories-brain:env`) for the haiku/opus calls the LLM stages use.

## Testing

Pure stages unit-tested with stubs (no models): `activityScore`, the confidence combine + split,
action-item→outline markdown rendering, and `ActiveTopic` assembly. The LLM-bearing stages (status,
confidence, tasks extraction, drafts, facts) run only in the overnight pass.

## Success criteria (human review)

In the morning, `index.md` shows a small number (≈3–5) of high-confidence active topics, each with a
fully-populated report (status + facts + tasks outline + drafts), plus a longer suggested list. The
per-field checklist and confidence/rationale surface any hallucinated or thin topics for judgement.

## Follow-ups (out of scope now)

- Automated LLM-judge completeness/faithfulness scoring (widen once the human review validates shape).
- Held-out incoming-mail contextualization eval (`facts = memory for new mail`).
- Promote the validated `ActiveTopic` fields into the product `Topic` schema + suggestion flow.
