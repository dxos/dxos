# Transcription Proper-Noun References (Storybook)

## Status

Approved (design). Ready for implementation planning.

## Context

`plugin-transcription` has scaffolding for entity extraction that never runs:

- [`extractionAnthropicFunction`](../../../packages/core/compute/assistant/src/extraction/extraction.ts) — an `Operation.make` placeholder with input/output schemas but **no handler**.
- [`processTranscriptMessage`](../../../packages/core/compute/assistant/src/extraction/extraction.ts) — a **no-op**; the executor call is commented out and it returns the input message unchanged (`TODO(dmaretskyi): Restore extraction logic`).
- [`findQuotes` / `insertReferences`](../../../packages/core/compute/assistant/src/extraction/quotes.ts) — a working quote→object search (`Filter.text(quote, { type: 'vector' })`) and a markdown DXN-link rewriter.
- The only entity-extraction story ([`LiveTranscription.stories.tsx`](../../../packages/plugins/plugin-transcription/src/stories/LiveTranscription.stories.tsx)) is commented out, needs a live microphone, and calls the no-op.

This spec restores a **minimal, real** slice of that pipeline as a self-contained Storybook demo: extract proper nouns from each incoming transcript message with a small LLM (Haiku), full-text-search the space for those nouns, and render matches as inline reference chips.

## Goals

1. A **mic-less** Storybook story that streams fake "incoming" transcription and links proper nouns to seeded objects, live.
2. The extraction logic lives in **reusable** functions/operations (usable by the app), not story-local throwaway code.
3. Demonstrate **matched vs. unmatched** behavior: nouns with a DB hit become chips; nouns without are dropped.

## Non-goals (YAGNI)

- No text correction, summarization, referent resolution, or "candidate" UI (the full [ENRICHMENT.md](../../../packages/plugins/plugin-transcription/ENRICHMENT.md) pipeline).
- No NER path (`extractionNerFunction` is left untouched).
- No new ECHO schema fields — references are surfaced as inline markdown DXN links, not stored on the block.

## Decisions (resolved with the user)

| Decision                   | Choice                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| DB search mode             | **Full-text** — `Filter.text(noun, { type: 'full-text' })` (production default; the assistant DB-query blueprint uses it). |
| LLM execution in Storybook | **Live Haiku** — `AiServiceTestingPreset('edge-remote')`.                                                                  |
| Code placement             | **Reusable operation/functions** in `@dxos/assistant/extraction`.                                                          |
| Seed/fixture               | **Reuse `seedTestData`** from `@dxos/types/testing`.                                                                       |

## Architecture

Three reusable units in `packages/core/compute/assistant/src/extraction/` plus one story. Each unit has a single responsibility, a typed interface, and one dependency.

### Unit 1 — `ExtractProperNouns` operation (the LLM unit)

- **Does:** `{ text: string } → { properNouns: string[] }`.
- **How:** `LanguageModel.generateObject({ schema, prompt })` against `ai.claude.model.claude-haiku-4-5`, prompted to return the surface strings of proper nouns (people, organizations, places, products). Same `AiService` pattern as [`summarize.ts`](../../../packages/plugins/plugin-transcription/src/operations/summarize.ts) (which uses Sonnet).
- **Depends on:** `AiService` only.
- **Replaces:** the placeholder `extractionAnthropicFunction` (no compatibility shim — call sites updated, see Affected Files).
- **Schema:** `Schema.Struct({ properNouns: Schema.Array(Schema.String) })` with field annotations to guide the model.

### Unit 2 — `findReferences(nouns, db, options?)` (the DB-search unit)

- **Does:** for each noun, `db.query(Filter.text(noun, { type: 'full-text' }))`; keep the top hit → `ReferencedQuotes` (`{ references: [{ id, quote: noun }] }`).
- **How:** generalize the existing `findQuotes` to take a `searchKind: 'full-text' | 'vector'` (default `'full-text'`). `findQuotes`'s current `'vector'` behavior is preserved by passing the option.
- **Depends on:** `Database` only. Deterministic — unit-testable over seeded objects with no LLM.

### Unit 3 — `processTranscriptMessage(message, deps)` (the orchestrator)

- **Does:** restore the existing no-op. For each `transcript` block in the message: run Unit 1 on `block.text` → run Unit 2 → rewrite `block.text` via the existing `insertReferences` (matched nouns become `[noun](dxn)` markdown). Returns the enriched `Message`.
- **Shape:** an `Effect` requiring `AiService`, taking the space `Database` as a plain argument (mirroring `findQuotes(quotes, db)`): `processTranscriptMessage(message, { db }): Effect<Message, …, AiService>`. Keeps `fallbackToRaw`/`timeout` options from the existing signature. Decoupled from app-framework — callers provide the `AiService` layer.
- **Note:** closes `TODO(dmaretskyi): Move context to a vector search index` — context now comes from live DB search instead of a passed-in `objects` array.

### Unit 4 — The story (`ProperNounExtraction.stories.tsx`)

- **Location:** `packages/plugins/plugin-transcription/src/stories/`, alongside `LiveTranscription` / `FileTranscription`.
- **Renders** through `<Transcription>` ([Transcription.tsx](../../../packages/plugins/plugin-transcription/src/components/Transcription/Transcription.tsx)); its `preview()` CodeMirror extension turns embedded DXN links into live reference chips — **no new UI**.
- **Decorators:** reuse [`createStoryDecorators`](../../../packages/plugins/plugin-transcription/src/stories/common.ts)` ({ enableVectorIndex: true })` unchanged — it seeds objects and enables query indexes. If full-text needs an index kind beyond `SCHEMA_MATCH`/`GRAPH`/`VECTOR` (validation point 2), extend `enableQueryIndexes` there.
- **AiService:** the replay loop runs the orchestrator `Effect` and provides `AiService.model('ai.claude.model.claude-haiku-4-5').pipe(Layer.provide(AiServiceTestingPreset('edge-remote')))` at run time — exactly the editor `Assistant.stories.tsx` pattern. No app-framework `OperationInvoker`/`LayerSpec` capability wiring required.
- **Replay:** reuse/adapt the scaffolded `EntityExtractionMessageBuilder` / `useTestTranscriptionQueue*` ([testing.ts](../../../packages/plugins/plugin-transcription/src/testing/testing.ts)) to replay `seedTestData`'s `transcriptMessages` on an interval, piping each through Unit 3 before appending to the render model. Toolbar pause/reset + a JSON status bar (extracted nouns) follow the existing `Transcription.stories.tsx` shell.

## Data flow

```
incoming transcript message
  └─ per transcript block:
       block.text ──[Haiku: ExtractProperNouns]──▶ proper nouns: string[]
                          │
                          └─[findReferences: Filter.text full-text]──▶ { id, quote }[]
                                   │
                                   └─[insertReferences]──▶ text with [noun](dxn) links
  └─ enriched Message ──▶ <Transcription> preview() ──▶ reference chips
```

## Seed data & fake incoming transcription

Reuse [`seedTestData`](../../../packages/sdk/types/src/testing/data.ts) verbatim:

- **Seeded objects:** orgs **Amco, Cyberdyne, DXOS, Ink & Switch**; people **John Doe, Sarah Johnson, Emma Rodriguez, David Williams, Michael Chen, Peter van Hardenberg**.
- **Incoming transcript:** the returned `transcriptMessages` — a quarterly-strategy-meeting conversation that already names those entities.

Expected demo behavior (lines already in the fixture):

- _"I see Sarah and Emma are here from Amco"_ → chips on **Sarah Johnson**, **Emma Rodriguez**, **Amco**.
- _"the new product line at Cyberdyne"_ → chip on **Cyberdyne**.
- _"Peter works at Ink and Switch"_ → chips on **Peter van Hardenberg**, **Ink & Switch**.
- Unmatched proper nouns — **Alex, Jennifer, TechGiant, Singapore** — extracted but **dropped** (no chip).

## Rendering

References are inline markdown DXN links produced by `insertReferences` (`[noun](<dxn>)`, where the DXN is built from the matched object id via `EID.make`). The `preview()` extension already renders these as preview chips — the same path ENRICHMENT.md describes for `references[]`. No component or schema changes.

## Testing

- **Unit (LLM):** `ExtractProperNouns` with a **memoized** model — `TestAiService({ memoize: true })` ([test-layers.ts](../../../packages/core/compute/ai/src/testing/test-layers.ts)). Deterministic, offline. Recorded via the `regenerate-memoized-llm` flow.
- **Unit (DB):** `findReferences` over seeded `Person`/`Organization` objects — asserts full-text hits/misses with no LLM.
- **Story:** stays a **live** demo (`edge-remote`); no `play()` assertions, since live LLM output is non-deterministic.

## Dependencies, risks, validation

1. **Edge access:** `edge-remote` makes real network calls and needs the storybook identity to have edge AI access — same requirement as the shipping editor `Assistant.stories.tsx`. The story does not render chips fully offline.
2. **Full-text tokenization (validate during implementation):** first-name-only mentions (_"Sarah"_ → object _"Sarah Johnson"_) and _"Ink and Switch"_ vs seeded _"Ink & Switch"_. If tokenization doesn't bridge these, normalize the query (e.g., per-token search like the assistant DB-query blueprint) or accept the misses. Confirm with the `findReferences` unit test before wiring the story.
3. **Cost/latency:** one Haiku call per transcript block. Acceptable for a demo; per-message batching is a future optimization.

## Affected files

- `packages/core/compute/assistant/src/extraction/extraction.ts` — add `ExtractProperNouns` operation + real handler; restore `processTranscriptMessage`; remove the `extractionAnthropicFunction` placeholder.
- `packages/core/compute/assistant/src/extraction/quotes.ts` — generalize `findQuotes` → `findReferences(..., { searchKind })`; update the lone call site.
- `packages/plugins/plugin-transcription/src/stories/common.ts` — reused unchanged; **only if** full-text needs an extra index kind, extend `enableQueryIndexes` (validation point 2).
- `packages/plugins/plugin-transcription/src/stories/ProperNounExtraction.stories.tsx` — **new** story.
- `packages/plugins/plugin-transcription/src/testing/testing.ts` — point `EntityExtractionMessageBuilder` at the restored orchestrator (operation invoker + db).
- Tests: `extraction.test.ts` (memoized `ExtractProperNouns`), `quotes.test.ts` (full-text `findReferences`).

## Out of scope / future

- Persisting `references[]`/`candidates[]` on the transcript block (ENRICHMENT.md schema deltas).
- Candidate UI for unmatched proper nouns (create-object / research actions).
- Wiring into the live meeting path ([call-extension.ts](../../../packages/plugins/plugin-meeting/src/capabilities/call-extension.ts)).
