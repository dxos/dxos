# Configurable email-pipeline story — Design

**Date:** 2026-07-06
**Status:** Approved (pending spec review)
**Tracking:** part of DX-1078
**Package:** `@dxos/stories-brain` (prototype; `plugin-brain` productization deferred)

## Purpose

Provide a Storybook harness that runs the **full email pipeline** over sample email messages and shows
the output of each stage. It is the interactive counterpart to the node-only, dataset-gated
`pipeline-email` worked test ([email-pipeline.test.ts](../../../packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts)):
same stages, but running in the browser over fixtures, with a per-stage output viewer. It supersedes
the single-document `Pipeline.stories.tsx` prototype for the email case and is the staging ground for
the future `plugin-brain` companion.

## The pipeline

Six `@dxos/pipeline` stages over a `Message` stream, in order:

1. **summarize** — LLM summary + spam flag appended to the message (needs `AiService`).
2. **extract-contacts** — `@dxos/extractor-lib` `extractContact` → `Person` / `Organization` ECHO objects (needs `AiService` + ECHO `Database`).
3. **stats** — pure-JS running tallies (senders, recipients, spam count).
4. **extract-facts** — `pipeline-rdf` `extractFactsStage` → semantic facts in `FactStore` (needs `AiService` + `FactStore`).
5. **threads** — `buildThreads` → `Thread` ECHO objects (needs ECHO `Database`).
6. **topics** — crawler `extractTopics` over the accumulated facts → `TopicReport` (needs `FactStore`).

## Key decisions (from brainstorming)

- **Execution (Q1):** Stages run **live** in the browser. Backend (local Ollama vs remote Edge) is a
  single `AiService` layer chosen by config — stages never branch on backend. A **fixture/replay**
  mode swaps the live `AiService` for a queued/mock one for offline, deterministic runs.
- **Layout (Q2):** **Master-detail.** The stage list is the master; selecting a stage shows its output
  in a detail pane.
- **Input (Q3):** **Email fixtures + editor.** An email list on the left; selecting one opens it in the
  `DocumentEditor`, whose text is bound to the message's **text `ContentBlock`** (editing edits that
  block). Run streams the selected message (or all) through the pipeline.
- **Scope (Q4):** **All 6 stages + a real ECHO space.** Contacts/threads materialize `Person`/`Org`/
  `Thread` into a `ClientPlugin` space, shown in an ECHO-objects view.
- **Config (Q5):** **Variant-driven.** Each story export is a pipeline configuration (Storybook args);
  the panel displays config read-only. Interactive per-stage editing is deferred.
- **FactStore:** in-memory (`FactStore.layerMemory`) in the browser (no `better-sqlite3`).

## Architecture

### Layout — three columns

```
┌─────────────────┬──────────────────────┬─────────────────────────┐
│ Input           │ Pipeline (master)    │ Stage output (detail)   │
│                 │                      │                         │
│ EmailList       │ PipelinePanel        │ <selected stage's       │
│  (fixtures)     │  - stage rows        │  OutputView>            │
│      +          │    (enable checkbox, │                         │
│ DocumentEditor  │     drag reorder,    │  e.g. FactViewer,       │
│  (message text  │     active spinner,  │  EchoObjectsView,       │
│   ContentBlock) │     backend/model    │  TopicsView, …          │
│  + Run trigger  │     read-only)       │                         │
└─────────────────┴──────────────────────┴─────────────────────────┘
```

### Stage registry — the extensibility seam

A single array of registry entries, one per stage; adding a stage = one entry + one view.

```ts
type StageDef = {
  id: string;                    // 'summarize' | 'extract-contacts' | …
  label: string;
  description: string;
  makeStage: (config: StageConfig) => Stage.Stage<Message, Message, …>;
  OutputView: FC<StageOutputProps>;  // renders this stage's accumulated output
};
```

`makeStage` receives the resolved config (it does not read the backend itself — the `AiService` layer
is provided once at the runner edge). The `Stage` co-locates with its `OutputView` so each stage is
self-contained (chosen over a central `switch`).

Stage → view mapping:

| Stage            | OutputView                                  | Status |
| ---------------- | ------------------------------------------- | ------ |
| summarize        | `SummaryView` (text + summary + spam flag)  | new    |
| extract-contacts | `EchoObjectsView` (Person/Org)              | new    |
| stats            | `StatsView` (tallies)                       | new    |
| extract-facts    | `FactViewer` + `EntityList` (fact-entities) | exist  |
| threads          | `EchoObjectsView` (Thread)                  | new    |
| topics           | `TopicsView` (`TopicReport`)                | new    |

### Execution — `runPipeline`

A helper that, on Run:

1. Selects enabled stages in list order.
2. Composes them into a `@dxos/pipeline` stream from the selected message(s).
3. Provides one merged layer: the config-selected `AiService`
   (`AiServiceTestingPreset('edge-remote')`, an Ollama preset, or a queued mock for fixture mode) +
   `FactStore.layerMemory` + the ECHO space `Database`.
4. Uses `Stream.tap` between stages to advance the active-stage indicator (same pattern as the current
   Pipeline story).
5. Accumulates each stage's result into per-stage state keyed by stage id (React state), which the
   detail pane reads for the selected stage.

Because backend is only an `AiService` layer, the **fixture/replay** mode is just a different layer —
no stage or runner branching.

### ECHO space

A `withPluginManager` + `ClientPlugin` decorator (same pattern as
[markdown-transcription-harness.tsx](../../../packages/stories/stories-brain/src/testing/markdown-transcription-harness.tsx))
provides a personal space with types `Person`, `Organization`, `Thread`. Contacts/threads stages write
via `space.db.add(...)`; `EchoObjectsView` reads via `useQuery`. The stages depend only on the ECHO
`Database` API (browser-safe) — `EchoTestBuilder` in the worked test is a node test convenience, not a
runtime requirement.

## Variants (story exports)

- **`AllEdge`** — all 6 stages enabled, backend edge-remote. Live.
- **`Fixture`** — replay mode (queued mock `AiService`), offline, deterministic. The CI-verifiable variant.
- **`LocalOllama`** — backend Ollama via `AiService`; documented as environment-dependent in-browser.

## Components

New (under `packages/stories/stories-brain/src/components/`):

- `EmailList/` — fixture email list + selection.
- `SummaryView/` — per-message summary + spam flag.
- `StatsView/` — sender/recipient/spam tallies.
- `TopicsView/` — `TopicReport` rendering.
- `EchoObjectsView/` — `useQuery`-backed list of ECHO objects, filtered by type (Person/Org/Thread).
- `StageOutput/` — detail host that renders the registry `OutputView` for the selected stage.

Reused / extended:

- `PipelinePanel/` — add master **selection** (selected stage id + `onSelect`) and read-only per-stage
  backend/model display; keep checkbox + drag.
- `DocumentEditor/` — bind value to the selected message's text `ContentBlock`.
- `FactViewer/`, `EntityList/` — unchanged.

New story: `stories/EmailPipeline.stories.tsx`.

## Testing / verification

- Basic component stories for each new view (`SummaryView`, `StatsView`, `TopicsView`, `EchoObjectsView`,
  `EmailList`) with fixtures + `withTheme()`.
- Composite `EmailPipeline` story verified via the deterministic **`Fixture`** variant, headless in the
  worktree storybook (Playwright): select an email → Run → each stage's detail renders its output; stage
  enable/reorder works.
- `AllEdge` verified live against Edge as a manual/one-off check (non-deterministic, not a CI gate).

## Risks / open items

- **`extractContact` browser-safety** — it is `AiService`-based; confirm it (and `@dxos/extractor-lib`)
  bundle for the browser during implementation. If not, contacts stage falls back to fixture output for v1.
- **Live variants are non-deterministic** — only the `Fixture` variant is CI-verifiable; `AllEdge` /
  `LocalOllama` depend on network/credentials.
- **`topics` cost** — `extractTopics` may issue additional LLM calls; the `Fixture` variant seeds its output.

## Deferred (not in this design)

- Interactive per-stage config editing (forms) — variants only for now.
- `plugin-brain` productization (companion over the _current_ document/email, real persistence).
- Predicate canonicalization strategy and the `valence`→`factuality` follow-ons tracked separately.
