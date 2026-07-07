# Normalize pipeline-* package layout — Plan

> **For agentic workers:** Execute task-by-task; each package is an independently verifiable phase. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give `@dxos/pipeline-rdf`, `@dxos/pipeline-email`, `@dxos/pipeline-transcription` a consistent folder layout, exports, filenames, and a canonical pipeline-construction test — WITHOUT changing behavior or public export symbols.

**Decisions (from audit):** keep transcription's `PipelineRuntime`/`Stage` abstraction (do NOT flatten to bare `@dxos/pipeline` `Stage` — it's already built on it and carries load-bearing trigger/window/concurrency/model metadata). Stage files use **kebab-case**. Part of DX-1078.

**Load-bearing invariant:** **the public export surface of each package stays identical** (same symbols importable from the package root). This is an internal reorg + barrels + test rename; consumers (`plugin-transcription`, `react-ui-transcription`, `crawler`, `pipeline-email`, `stories-brain`) must not need changes. Verify per package with a consumer build.

## Target layout (each package)

```
src/
  stages/          per-stage file (kebab) + index.ts barrel
  types/           type/schema files + index.ts barrel
  testing/         fixtures/harness + index.ts barrel
  <assembly>.ts    package-specific assembly/helpers (FactStore, threads, PipelineRuntime, …)
  errors.ts
  index.ts         normalized ordering (see per-package notes — preserves existing symbol surface)
  pipeline.test.ts canonical test: assembles the package's stages and runs them via its pipeline API
  internal/        private impl NOT in the public surface (barrel optional) — all three get one
```

**`internal/` rule:** a module belongs in `internal/` iff it is (a) not re-exported from `index.ts` AND (b) not imported by any other package. Moving something there must not change the public surface — verified by the per-package consumer-build gate. pipeline-rdf already has `internal/`; email and transcription gain one.

## Export-surface rule (important nuance)

`types/` gets a barrel in all three, but HOW it is re-exported from `index.ts` preserves each package's current contract:
- **pipeline-rdf:** already `export * as Type from './types'` (consumers use `Type.Fact`). Keep as-is.
- **pipeline-email:** `types/` (`Thread`) is currently NOT re-exported from root; no external consumer imports it. Keep it out of root (or add `export * as Type` only if a consumer needs it — none today). Do not introduce a breaking change.
- **pipeline-transcription:** consumers import types **top-level** (`Stage`, `TranscriptEvent`, `CommitFn`, `TelemetryEvent`, `EntityLookup`, `StageWrite`, …). The `types/` barrel must be re-exported **top-level** (`export * from './types'`), NOT under a `Type` namespace — a namespace would break `plugin-transcription`/`react-ui-transcription`.

Document this rule in each `index.ts` with a short comment so the divergence is intentional, not drift.

---

## Task 1: pipeline-rdf

**Current:** stages live in `SemanticPipeline.ts` (`extractFactsStage`, `indexFactsStage`, `normalizeFactsStage`, `extractDocFacts`, `extractFacts`, `DocumentFacts`, `NormalizeOptions`, `SemanticPipeline`, `normalizeEntityId`) + `internal/stages/{chunk,extract,reconcile}`. Has `types/` (as `Type`) and `testing/` already. Test: `SemanticPipeline.test.ts`.

- [ ] **Create `src/stages/` with kebab files**, moving the stage definitions out of `SemanticPipeline.ts`:
  - `stages/extract-facts.ts` — `extractDocFacts`, `extractFacts`, `extractFactsStage`, `DocumentFacts`, `normalizeEntityId` (the pure derivation + stage).
  - `stages/index-facts.ts` — `indexFactsStage` (store-writing stage).
  - `stages/normalize-predicates.ts` — `normalizeFactsStage`, `NormalizeOptions`.
  - `stages/index.ts` — barrel re-exporting the above.
  - Keep `SemanticPipeline.ts` for the batch assembly helper only (`SemanticPipeline.run`) importing stages from `./stages`. (Keep `internal/stages/*` where they are — they're private impl, not public stages.)
- [ ] **`index.ts`**: add `export * from './stages';`; keep `export * as Type from './types'` and the rest. Remove now-moved re-exports from `./SemanticPipeline` that duplicate `./stages`.
- [ ] **Rename** `SemanticPipeline.test.ts` → `pipeline.test.ts` (git mv); it already assembles `extractFactsStage`/`normalizeFactsStage`/`indexFactsStage` via `Pipeline.run` — the canonical test.
- [ ] **Verify:** `moon run pipeline-rdf:build pipeline-rdf:test pipeline-rdf:lint` green; then consumer builds `moon run crawler:build pipeline-email:build stories-brain:build` green (public surface unchanged). `pnpm format`.
- [ ] **Commit:** `refactor(pipeline-rdf): normalize stages/ layout and canonical pipeline.test.ts`.

## Task 2: pipeline-email

**Current:** stages in `stages.ts` (`summarizeStage`, `extractContactsStage`, `statsStage`, `EmailPipelineCtx`, `Summary`, `Stats`, `emptyStats`) + `extract-stage.ts` (`extractFactsStage` wrapper, `FactIndexer`). Also `facts.ts`, `fact-index.ts`, `threading.ts`, `threads.ts`. Has `types/` (`Thread`) + `testing/`. Tests: `stages.test.ts`, `extract-stage.test.ts`, `testing/email-pipeline.test.ts` (the assembly).

- [ ] **Create `src/stages/`** and move stage files in (kebab): `stages/summarize.ts` (+ ctx/types or keep ctx in a `stages/context.ts`), `stages/extract-contacts.ts`, `stages/stats.ts`, `stages/extract-facts.ts` (from `extract-stage.ts`). `stages/index.ts` barrel. Move `stages.test.ts` → `stages/*.test.ts` next to each, or a single `stages/stages.test.ts`. Keep `facts.ts`/`fact-index.ts`/`threading.ts`/`threads.ts` at root (assembly/helpers) unless clearly a stage.
- [ ] **`src/internal/`**: move genuinely-private helpers (not in `index.ts`, not imported cross-package) here with a barrel — e.g. `threading.ts` (thread-id/subject derivation) and any `fact-index.ts`/`threads.ts` internals that aren't part of the public surface. Update in-package imports (incl. tests) to the new paths. Verify the public surface is unchanged.
- [ ] **`index.ts`**: `export * from './facts'; export * from './stages';` (preserve current symbols). Keep `types/` out of root (no consumer needs it) — or add a comment noting it's intentionally internal.
- [ ] **Add canonical `src/pipeline.test.ts`** that assembles the email stages (`summarizeStage`→`extractContactsStage`→`statsStage`→`extractFactsStage`) via `Pipeline.run` over a couple of fixture messages with a mock `AiService` + in-memory `EmailPipelineCtx` (mirror `pipeline-rdf`'s `pipeline.test.ts` shape). The existing `testing/email-pipeline.test.ts` (Enron/Ollama-gated) stays as the heavy integration test.
- [ ] **Verify:** `moon run pipeline-email:build pipeline-email:test pipeline-email:lint` green; `moon run stories-brain:build` green. `pnpm format`.
- [ ] **Commit:** `refactor(pipeline-email): normalize stages/ layout and add canonical pipeline.test.ts`.

## Task 3: pipeline-transcription

**Current:** stages already in `stages/` (kebab). Types scattered at root (`TranscriptEvent.ts`, `Stage.ts`, `lookup.ts`, `PipelineConfig.ts`, `model-routing.ts`). Test: `pipeline-integration.test.ts`. Keep `PipelineRuntime`/`Stage` abstraction.

- [ ] **Create `src/types/`** and move the pure type/schema modules in: `types/transcript-event.ts` (from `TranscriptEvent.ts`), `types/stage.ts` (from `Stage.ts` — the `Stage` interface + `StageWrite`/`StageContext`/triggers), `types/lookup.ts`, `types/pipeline-config.ts` (from `PipelineConfig.ts`). `types/index.ts` barrel. Keep `PipelineRuntime.ts`, `model-routing.ts`, `dispatch.ts`, `live.ts`, `asr/`, `stages/` as assembly/runtime.
  - Kebab-rename the moved type files; keep exported symbol NAMES unchanged.
- [ ] **`index.ts`**: re-export the `types/` barrel **top-level** (`export * from './types';`) so `Stage`/`TranscriptEvent`/`StageWrite`/etc. remain importable from the root (consumers depend on this). Add a comment: types are top-level (not a `Type` namespace) because consumers import them directly.
- [ ] **`src/internal/`**: move genuinely-private modules (not re-exported from `index.ts`, not imported cross-package) here with a barrel — e.g. `asr/util.ts` and any non-exported helpers. Do NOT move exported runtime (`PipelineRuntime`, `model-routing` `resolveModel`, `dispatch` `CommitFn`/`makeEchoCommit`) — those are public. Verify the public surface is unchanged.
- [ ] **Rename** `pipeline-integration.test.ts` → `pipeline.test.ts` (git mv). It assembles stages via `PipelineRuntime.run` — the canonical test for this package (its pipeline API is `PipelineRuntime`, which sits on `@dxos/pipeline`).
- [ ] **Verify:** `moon run pipeline-transcription:build pipeline-transcription:test pipeline-transcription:lint` green; then **consumer builds** `moon run plugin-transcription:build react-ui-transcription:build` green (public surface unchanged — this is the critical check). `pnpm format`.
- [ ] **Commit:** `refactor(pipeline-transcription): types/ barrel and canonical pipeline.test.ts`.

## Task 4: final consistency check

- [ ] Diff the three `index.ts` files and confirm the structure is consistent (stages barrel exported; types barrel present; testing subpath; `internal/` present). Note the intentional divergences (rdf `Type` namespace; transcription top-level types) in a one-line comment each.
- [ ] Full check: `moon run pipeline-rdf:test pipeline-email:test pipeline-transcription:test` + the consumer builds all green.
- [ ] Update `DESIGN.md`/spec references to renamed files if any.

## Risks

- **Public-surface drift** is the main risk — mitigated by the per-package consumer-build gate (esp. transcription → plugin-transcription/react-ui-transcription). If any consumer breaks, the reorg changed a symbol's import path; fix the re-export, don't change the consumer.
- Internal-namespace import rules (`*Internal` barrels) don't apply here — these packages aren't namespace-per-module; keep their existing import idioms.
