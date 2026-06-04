# Transcript Enrichment

Design for running a secondary LLM in parallel with the Whisper transcription stream to correct
text, surface entity references, and maintain a rolling summary with referent resolution.

## Status

Proposed. Current `extractionAnthropicFunction` and `sentenceNormalization` operations are stubs;
this document is the contract for restoring them on top of `@effect/ai` / `LanguageModel`.

## Goals

1. **Correction**: fix Whisper's punctuation/capitalization and recover words split across batch
   boundaries — without waiting for the speaker to finish.
2. **Reference linking**: link mentions of existing ECHO objects (Person, Organization, …) in the
   transcript to their canonical `Ref<T>`s.
3. **Candidate identification**: surface nouns / proper nouns that _aren't_ yet in the space, so the
   user can act on them (create object, research, link to existing).
4. **Cumulative summary**: maintain a single, periodically-updated summary of the conversation that
   reflects newly transcribed content and newly extracted references.
5. **Referent resolution**: resolve deictic / anaphoric references like _"I"_ (→ the speaker),
   _"there"_, _"them"_, _"the meeting"_ (→ entities established earlier in the conversation) into
   their concrete referents inside the summary.

## Architecture

Three concurrent passes, each running off the same ECHO feed populated by the Whisper pipeline:

```text
                 ┌─── Pass A — Enrichment ─────────────────────────────────────┐
Whisper batch ──►│ trigger: every new batch                                    │
                 │ window:  last 8 transcript blocks (≈30s)                    │
                 │ output:  { corrected, references[], candidates[] }          │
                 │ writes:  Obj.update on the just-appended block              │
                 │ policy:  cancel in-flight on new batch (latest-wins)        │
                 └─────────────────────────────────────────────────────────────┘
                 ┌─── Pass B — Summary ────────────────────────────────────────┐
end-of-utterance │ trigger: ≥5s silence AND ≥60s since last summary            │
       +         │ input:   prior summary + new corrected content + recent     │
silence timer ──►│          references + speaker identity hints                │
                 │ output:  { summary, resolvedReferents }                     │
                 │ writes:  Obj.update on Transcript.summary                   │
                 │ policy:  skip if an in-flight summary call is running       │
                 └─────────────────────────────────────────────────────────────┘
                 ┌─── Pass C — Referent resolution ────────────────────────────┐
(invoked from B) │ embedded in Pass B's prompt; not a separate LLM call.       │
                 │ Output schema includes a `resolvedReferents` map so the     │
                 │ summary text can use canonical names instead of pronouns.   │
                 └─────────────────────────────────────────────────────────────┘
```

Execution: all three run in the **browser** via `AutomationCapabilities.ComputeRuntime`. No new
edge endpoints are required for the initial implementation. (A future optimisation chains Whisper
→ Claude inside the existing Cloudflare worker to save one client-side round trip.)

Model: `ai.claude.model.claude-haiku-4-5` for all passes — same model used by `update-chat-name` and
`assistant-toolkit`'s `qualifier`. Cheap, fast, and competent at structured output.

## Pass A — Enrichment

**Operation**: restore `extractionAnthropicFunction` in
`packages/core/compute/assistant/src/extraction/extraction.ts` with a real handler that calls
`LanguageModel.generateObject({ schema: EnrichmentOutput, prompt })`.

**Input**: the sliding window (8 most-recent transcript blocks) + nearby ECHO objects (Person /
Organization, queried from the space) to give the LLM linkable candidates.

**Output schema**:

```ts
EnrichmentOutput = {
  blocks: Array<{
    blockId: string;
    corrected: string;
    references: Ref.Ref<Person | Organization | …>[];
    candidates: Array<{
      text: string;
      kind: 'noun' | 'proper-noun';
      start: number;          // offset into `corrected`
      end: number;
      suggested?: { typename: string };
    }>;
  }>;
};
```

**Concurrency**: a single fiber per article. If a new batch arrives while a call is in flight,
the existing fiber is interrupted (`Fiber.interrupt`) and a new one is started over the latest
window. The corresponding Whisper raw text is already in the feed, so the worst case is that a
block briefly displays unredacted Whisper output until the next enrichment lands.

## Pass B — Summary

**Operation**: give `TranscriptOperation.Summarize`
(`packages/plugins/plugin-transcription/src/types/TranscriptOperation.ts`) a real handler — its
input schema already accepts a transcript string and optional notes; extend it with
`previousSummary?: string` and a referent-resolution output field.

**Input**:

- `previousSummary` — the summary as of the last invocation (cumulative state).
- `transcriptSinceLast` — corrected content appended since `previousSummaryUpdatedAt`.
- `recentReferences` — references and candidates emitted by Pass A in the same window.
- `speakers` — for each `actorId` seen recently, the speaker's display name (or `did`).

**Output schema**:

```ts
SummaryOutput = {
  summary: string;
  // Concrete bindings for deictic / anaphoric pronouns the LLM resolved while writing
  // the summary. Stored on the transcript for downstream consumers (search, citations).
  resolvedReferents: Array<{
    surface: string;          // "I", "there", "them", "the meeting"
    referent: string;         // canonical name or description
    ref?: Ref.Ref<unknown>;   // optional ECHO ref when the referent is a known object
  }>;
};
```

**Trigger**: a debouncer driven by `useIsSpeaking`. The summary fires when:

1. `isSpeaking` has been `false` for ≥ `silenceThresholdMs` (default 5_000 ms), **and**
2. ≥ `minSummaryIntervalMs` (default 60_000 ms) have elapsed since the last summary write.

If both conditions hold and a summary call is already running, the new request is dropped
(skip-if-busy). The trigger re-arms when speech resumes.

**Storage**: `Transcript.summary?: string` plus `Transcript.summaryUpdatedAt?: string`. Single
field — overwritten cumulatively, not append-only.

## Pass C — Referent resolution

Referent resolution is not a separate LLM call; it is part of Pass B's prompt and output. The
key inputs that make resolution work:

- **Speaker identity**: every `Message.Message` written by `TranscriptionManager` already carries
  `sender.identityDid`. The hook resolves `did → display name` via `space.members` and includes
  the mapping in the prompt. _"I"_ resolves to the speaker of the block containing the pronoun.
- **Prior summary as conversational memory**: places, events, and people named earlier in the
  conversation are in `previousSummary`. The LLM resolves _"there"_ against this memory.
- **Reference and candidate context**: references and candidates from Pass A are echoed into the
  prompt so the LLM can prefer those over inventing new entities.

The `resolvedReferents` field surfaces the bindings the LLM made. Two uses:

1. The summary text itself uses canonical names ("Rich said he'd go to London") rather than
   pronouns, making it self-contained.
2. Downstream tools (search, agent follow-ups) can use the `Ref<T>` bindings to navigate from a
   pronoun in the summary to the underlying ECHO object.

### Example

Spoken (split across two utterances):

> Rich: "I'm going to go there next week."
> _(two minutes earlier)_ Anna: "We should do another offsite in London this spring."

Summary text should read approximately:

> Rich is planning to travel to London next week, following Anna's suggestion to hold an offsite there this spring.

With `resolvedReferents = [{ surface: 'I', referent: 'Rich', ref: rich.id }, { surface: 'there', referent: 'London' }]`.

## Schema deltas

**`ContentBlock.Transcript`** (in `@dxos/types`) — add three optional fields:

```ts
{
  _tag: 'transcript';
  started: string;
  text: string;          // raw Whisper output
  corrected?: string;    // Pass A; renderer prefers this when present
  references?: Ref.Ref<…>[];
  candidates?: Array<{ text; kind; start; end; suggested? }>;
}
```

**`Transcript.Transcript`** — add two optional fields:

```ts
{
  ...existing,
  summary?: string;
  summaryUpdatedAt?: string;
}
```

Both deltas are additive; existing data and consumers continue to render correctly.

## Wiring

- **`packages/core/compute/assistant/src/extraction/extraction.ts`** — restore
  `extractionAnthropicFunction` handler.
- **`packages/plugins/plugin-transcription/src/types/TranscriptOperation.ts`** — extend
  `Summarize` input/output; restore handler in `src/operations/summarize.ts`.
- **`packages/plugins/plugin-transcription/src/hooks/useTranscriptEnrichment.ts` (new)** — owns the
  sliding window, the Pass A fiber + interrupt, the Pass B silence timer, and writes back to the
  feed message / transcript object via `Obj.update`. Resolves the runtime via
  `useCapability(AutomationCapabilities.ComputeRuntime).getRuntime(spaceId)`.
- **`TranscriptionArticle.tsx`** — call `useTranscriptEnrichment(transcript)` alongside
  `useTranscriptionRecording(transcript)`. (`TranscriptionManager` stays focused on recording
  → feed.)
- **`components/Transcription/transcription-extension.ts`** — CodeMirror decoration for
  `candidates[]` (subtle underline + click menu); the existing `preview` extension already
  renders `references[]` as DXN preview links once they appear on the block.

## Phasing

A minimum slice for the first PR:

1. Schema deltas (additive only).
2. `extractionAnthropicFunction` handler (Pass A).
3. `useTranscriptEnrichment` hook with Pass A only + cancel-on-batch.
4. Renderer: prefer `corrected` over `text`; render `references[]`. Candidates rendered as
   non-interactive styled spans.
5. `LiveTranscription` story exercises end-to-end against seeded `Person` / `Organization` objects.

Follow-up PRs:

- Pass B (summary) with referent resolution.
- Candidate click menu + follow-up operations (`Create Person`, `Research`, `Link to existing…`).
- Edge-side enrichment path (Whisper + Claude in one round trip).

## Defaults

| Knob                     | Default                           | Notes                                         |
| ------------------------ | --------------------------------- | --------------------------------------------- |
| Model                    | `ai.claude.model.claude-haiku-4-5`     | Same as `update-chat-name` / `qualifier`.     |
| Pass A window            | 8 transcript blocks               | Approximately 30 s at default Whisper config. |
| Pass A concurrency       | Latest-wins (interrupt in-flight) | One fiber per article.                        |
| Pass B silence threshold | 5 000 ms                          | Re-arms on next speech edge.                  |
| Pass B min interval      | 60 000 ms                         | Lower bound on summary cadence.               |
| Pass B concurrency       | Skip-if-busy                      | Avoids piling up cumulative calls.            |
