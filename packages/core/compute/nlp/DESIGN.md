# @dxos/nlp — Design

## Goal

Parse natural-language text into a structured, per-word representation (parts of speech) used to
analyze the meaning/intention of user input and of transcripts. Built alongside
`@dxos/pipeline-transcription` and `plugin-transcription`.

Two decoupled parts:

1. **Parser** — pure `text → Document` (the data structure). No editor knowledge.
2. **Decoration extension** — a CodeMirror extension that renders per-word decorations from
   externally-settable analysis state, optionally driving the parser itself on edits.

## Part 1 — Parser (`@dxos/nlp`)

### Standard

Tags use the **Universal POS (UPOS)** tagset (17 tags: `NOUN`, `VERB`, `ADJ`, `ADV`, `PROPN`,
`PRON`, `DET`, `ADP`, `CCONJ`, `SCONJ`, `NUM`, `PART`, `INTJ`, `AUX`, `SYM`, `PUNCT`, `X`).
Language-agnostic, small, consistently taggable by an LLM, and maps cleanly to a fixed color
palette. Fine-grained `xpos` (e.g. Penn Treebank) and `lemma`/`entity` are reserved as
later-addable token fields (this is how CoNLL-U layers them).

### Data structure (Effect `Schema`)

- `Token`: `{ index, text, upos, start, end }` — `start`/`end` are character offsets within the
  analyzed source text; `index` is the token's position in its sentence.
- `Sentence`: `{ index, start, end, tokens: Token[] }` — sentence-level grouping retained
  (transcripts/intention analysis are sentence-oriented); a token's absolute position is still
  available via its own offsets.
- `Document`: `{ sourceHash, sentences: Sentence[], timestamp? }` —
  - `sourceHash`: fast non-crypto hash (FNV-1a / cyrb53) of the exact source text analyzed; the
    divergence signal (see Part 2).
  - `timestamp`: optional wall-clock, debug/display only — **not** a divergence signal.

### Offset strategy

The LLM returns only the linguistic judgment it is good at — sentences → tokens as
`{ text, upos }`, no offsets. Deterministic code then **aligns** those surface forms back against
the source string to compute exact `start`/`end`. Model does linguistics; code does arithmetic, so
offsets can never drift.

### Implementation

A single AI call via the existing `@dxos/ai` / `Operation` + `LanguageModel.generateObject` seam
(same pattern as `transcription-pipeline` stages and `plugin-transcription/enrichment`). A
deterministic rule/lexicon-based **stub tagger** ships alongside so stories and tests run offline
with no Anthropic key (matching the pipeline-stub convention); a flag switches to the live model.

## Part 2 — Decoration extension

Lives where editor extensions live (`@dxos/ui-editor`, modeled on `annotations.ts`). The extension
only ever **renders the analysis state it holds**; who computes that state is pluggable.

### Span-oriented state model

The unit of analysis is a **span**, not the whole document (supports selective analysis like
comment spans, and keeps cost bounded on large docs).

- A `StateField` holds a set of analyzed spans, each `{ from, to, sourceHash, document }` —
  `sourceHash` covers only that span's substring.
- A `StateEffect` sets/replaces/removes spans. Any external driver (the pipeline, an "analyze this
  email" action) dispatches it.
- **Decorations** (`Decoration.mark`, one CSS class per UPOS tag) are derived from the field.
- **Anchors follow edits for free:** on every transaction the field maps its span ranges through
  `tr.changes` (standard CodeMirror range-mapping). No hashing needed for repositioning.

### Reactive mode (optional, config flag)

When enabled, the extension watches doc changes and, on idle (~500ms debounce), calls an injected
`parse: (text) => Promise<Document>` callback for the relevant span(s) and dispatches the
StateEffect with the result. When disabled, state is purely externally driven.

### Divergence detection

Per-span, and only for spans an edit actually touched:

1. Map span ranges through `tr.changes` (keeps them anchored).
2. For spans intersecting the transaction's changed ranges, re-hash **just those** current
   substrings and compare to the stored `sourceHash`.
3. Mismatch → mark that span **stale**: its decorations render dimmed/"pending" (ranges stay
   positioned via mapping rather than vanishing/jumping); in reactive mode this also schedules a
   re-parse of that span.

Cost is bounded by edited-span size, never document size. `sourceHash` traveling with the
`Document` makes divergence detection work identically across the StateEffect boundary (the
pipeline computes a parse off block text; the editor can still tell if its current text matches) —
no shared transaction stream required.

## Scenarios

| Scenario               | Reactive | Driver                                                |
| ---------------------- | -------- | ----------------------------------------------------- |
| User typing            | on       | Extension self-drives the parser, debounced.          |
| Analyze existing text  | off      | One span over selection/whole doc; parse once, set.   |
| Transcription pipeline | off      | New pipeline stage calls `@dxos/nlp`; one span/block. |

## Deliverables

1. `@dxos/nlp` package: `Document`/`Sentence`/`Token` schema, `sourceHash`, alignment, parser
   Operation + deterministic stub tagger. Unit tests on schema + alignment + stub.
2. Decoration extension (StateField + StateEffect + reactive config + UPOS theme) in `@dxos/ui-editor`.
3. A `plugin-transcription` **story**: a markdown document + the extension, reactive mode on,
   wired to the stub tagger by default with a toggle for the live AI parser; shows per-word POS
   decorations recomputing on edit and dimming when stale.

## Out of scope (deferred)

- `lemma`, `entity`/NER, `xpos` token fields (added when intention analysis / diarization labeling
  needs them).
- Wiring the new stage into the live transcription pipeline / plugin (story demonstrates the seam).
- Acoustic diarization (a text parser does not provide that signal).
