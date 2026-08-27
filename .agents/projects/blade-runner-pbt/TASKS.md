# blade-runner-pbt — Tasks

Property-based (fast-check) end-to-end test of real clients replicating through EDGE, in the
blade-runner harness. Spec + decisions: [DESIGN.md](./DESIGN.md).

## Phase 0: Design (G0)

Produce a reviewed design; every §14 open question answered and recorded in §15.

### Tasks

- [x] **Survey prior art** — blade-runner harness, existing fast-check stress tests
  (`teleport-extension-replicator`, `client-services` pipeline — both skipped), real-client
  invitation tests, `sync.test.ts` edge quiescence predicate, `EDGE_URLS` presets.
- [x] **Write DESIGN.md** — architecture, model, command vocabulary, assertions,
  determinism/shrinking, parameters, environments, cleanup, CI, open questions.
- [ ] **Review with user** — collect answers to DESIGN.md §14 Q1–Q14, record in §15, fold
  into the affected sections.
- [ ] **Confirm edge-side cleanup story** (Q10) — what the edge repo exposes today
  (admin delete, `space.delete()` DO reclamation, TTL tenant); file edge-repo work if needed.

## Phase 1: Local-edge MVP (G1)

Deterministic skeleton first: fixed example sequences against local edge, no randomness yet.

### Tasks

- [ ] **`ClientReplicant`** (`packages/e2e/blade-runner/src/replicants/client-replicant.ts`)
  — real `Client`, persistent storage under `outDir`, RPC verbs per DESIGN.md §3:
  init/destroy, createIdentity, createSpace (+ edge replication ENABLED + delegated
  multi-use invitation), joinSpace, createDocument, editDocumentText, editDocumentCounter,
  deleteDocument, flush, getSyncState, digest.
- [ ] **`EdgePbt` plan skeleton** (`src/spec/edge-pbt.ts`, registered as `edgePbt` in
  `main.ts`) — spawn fleet, run a hard-coded command list (the `examples` pattern from the
  existing stress tests), final stabilization + digest comparison.
- [ ] **Convergence assertions** — quiescence predicate vs edge peer (DESIGN.md §7), digest
  equality across clients, model equality.
- [ ] **Run green against local edge** (`moon run edge:dev` in the edge repo, Redis up) with
  2 clients / 1 space / create+edit+delete — show output.

## Phase 2: Property-based generation (G1)

### Tasks

- [ ] **Model + commands** — `fc.AsyncCommand<Model, Real>` per DESIGN.md §6 with
  model-only `check()` preconditions; unique-token + single-writer-counter edit encoding.
- [ ] **Seeded runner** — `--seed` CLI flag through `GlobalOptions` into both `seedrandom`
  and `fc.assert`; `command-trace.jsonl` written per run.
- [ ] **Soak vs dev modes** — `interruptAfterTimeLimit` (+ `markInterruptAsFailure: false`),
  `endOnFailure` soak config; shrink-enabled dev config; weights in spec.
- [ ] **Checkpoint command** — mid-run quiesce+assert for online members (per Q14 decision).
- [ ] **Burn-in locally** — repeated seeds against local edge; fix or file every flake
  (a failing sequence graduates to a deterministic `examples` regression).

## Phase 3: Preview env + cleanup (G2)

### Tasks

- [ ] **`edgeEnv: 'preview'`** — preset wiring, `pbt-<runId>` tagging of spaces/identities,
  auth if required (Q10).
- [ ] **Cleanup phase** — `finally`-scoped teardown per DESIGN.md §11: client-side
  `space.delete()` sweep + server-side admin deletion (per Q10 decision); runs on success,
  failure, and timeout; verified by a follow-up existence check.
- [ ] **Document the run book** — how to run locally against local edge and against preview
  (blade-runner README section).

## Phase 4: Nightly CI (G3)

### Tasks

- [ ] **Workflow** — `.github/workflows/nightly-pbt.yml`: cron + `workflow_dispatch`
  (seed/env/budget inputs), Redis service, blade-runner build, time-budgeted `edgePbt` run.
- [ ] **Edge provisioning in CI** — per Q9 decision (cross-repo checkout of `dxos/edge` vs
  published artifact vs preview-only).
- [ ] **Failure artifacts** — upload command trace, seed+spec, per-replicant `agent.log`,
  perfetto, sync-state dumps, tarred storage dirs.
- [ ] **Failure routing** — per Q13 decision.

## Backlog

- [ ] Chromium replicants / mixed node+browser fleets (`platform` already supports it).
- [ ] Network-only disconnect toggle (edit-while-offline coverage for the acting client, Q6).
- [ ] Edge restart / chaos actions (local edge only).
- [ ] Feed/queue objects coverage (v1 is documents only).
- [ ] Invitation-type matrix (interactive vs delegated, auth methods).
- [ ] Un-skip / fold in the legacy stress tests once the harness patterns stabilize.
