# blade-runner-pbt — Tasks

Property-based (fast-check) end-to-end test of real clients replicating through EDGE, in the
blade-runner harness. Spec + decisions: [DESIGN.md](./DESIGN.md).

## Phase 0: Design (G0) — DONE

- [x] **Survey prior art** — blade-runner harness, the two skipped fast-check stress tests,
  real-client invitation tests, `sync.test.ts` edge quiescence predicate, `EDGE_URLS` presets.
- [x] **Write DESIGN.md** — architecture, model, command vocabulary, assertions, run shape,
  parameters, environments, cleanup, CI.
- [x] **Review with user** — D1–D14 recorded in DESIGN.md §17 and folded into the sections.
- [x] **Document blade-runner architecture** (DESIGN.md §3) — process roles, orchestrator
  lifecycle, replicant registry, RPC reflection + JSON codec, spawn/platforms, Redis, invocation.
- [x] **Confirm edge-side cleanup story** — the API exists (DESIGN.md §13): self-serve
  `DELETE /data/space/:spaceId` + `DELETE /data/identity/:identity` (VP auth, caller must be
  member/self) and admin-key `DELETE /admin/spaces|identities/:id`, `GET /admin/spaces`,
  `POST /admin/selective-purge`. Mounted at the edge worker root.

## Phase 1: Local-edge MVP (G1)

Deterministic skeleton first — fixed command lists, no randomness — so the harness plumbing is
proven before generation is layered on.

### Tasks

- [ ] **`ClientReplicant`** (`packages/e2e/blade-runner/src/replicants/client-replicant.ts`) —
  real `Client` over `LocalClientServices`, persistent storage under `outDir`, the JSON-only RPC
  surface in DESIGN.md §4, `@trace.span()` on each verb, registered with `ReplicantRegistry` and
  reachable from the entry bundle.
- [ ] **Verify the offline/online mechanism** (DESIGN.md §15.1) — `host.edgeConnection.close()` /
  `.open(ctx)`. Expect `_networkingStarted` to block re-dialing after a close; land the SDK fix
  (reset the flag in `EdgeClient._close`) with a test, or fall back to destroy+init.
- [ ] **Fixture setup** — 7 identities / 10 clients (3 identities × 2 devices), HALO device
  invitations for the sibling pairs, an edge agent per identity; measure setup time and
  parallelize if agent creation dominates.
- [ ] **`EdgePbt` plan skeleton** (`src/spec/edge-pbt.ts`, registered as `edgePbt` in `main.ts`)
  — spawn the fleet, run a hard-coded command list, final stabilization + digest comparison.
- [ ] **Assertions** — quiescence predicate vs the edge peer, cross-device digest equality, model
  equality (DESIGN.md §9), each with its own explicit timeout (there is no RPC timeout).
- [ ] **Run green against local edge** — edge repo `moon run edge:dev` + Redis; scenario covering
  device-sibling replication, invitation-through-edge, an offline edit, and a delete. Show output.

## Phase 2: Property-based generation (G1)

### Tasks

- [ ] **Model + commands** — `fc.AsyncCommand<Model, Real>` per DESIGN.md §8 with model-only
  `check()`; per-identity membership, per-client digests, tri-state client status.
- [ ] **Seeded runner** — `--seed` CLI flag through `GlobalOptions` into both `seedrandom` and
  `fc.assert`; `command-trace.jsonl` written per run.
- [ ] **Soak vs dev shape** — `interruptAfterTimeLimit` + `markInterruptAsFailure: false` and
  `endOnFailure` for the soak; `shrink: true` for local short runs; weights in the spec.
- [ ] **Checkpoint command** — mid-run quiesce + assert over online members only.
- [ ] **Burn-in locally** — repeated seeds against local edge; every failure either gets fixed or
  becomes a deterministic `examples: [...]` regression case.

## Phase 3: Preview env (G2)

### Tasks

- [ ] **`edgeEnv: 'preview'`** — preset wiring, `pbt-<runId>` labels on spaces/identities, and
  `clientTag: 'pbt-<runId>'` so runs are attributable in edge metering.
- [ ] **Scale run against preview** — the nightly shape (10 clients, 10 spaces, 60 min) executed
  by hand, with artifacts collected.
- [ ] **Run book** — how to run against local edge and against preview (blade-runner README).

## Phase 4: Cleanup — IMPORTANT, blocks G3

Deferred by decision (D10), but the nightly cannot be enabled until this lands: each 60-minute
preview soak creates identities, agents, spaces and documents.

### Tasks

- [ ] **Verify VP-auth self-deletion works for a fresh test identity** (DESIGN.md §15.2) — the
  `/data/*` routes reject identities not bound to a Hub account with 403. One manual
  `DELETE /data/space/:spaceId` against preview decides whether path A is viable.
- [ ] **Typed client methods** — add the data-management routes to `EdgeHttpClient`
  (`packages/core/mesh/edge-client`): inspect/delete space, inspect/delete identity.
- [ ] **Run-scoped teardown** — `try/finally` inside `plan.run` (the only place that executes
  after a failure): every identity deletes its spaces then itself; deletion is enqueued (202), so
  poll the inspect endpoints to confirm.
- [ ] **Leak sweeper** — admin-key pass over `GET /admin/spaces` / `GET /admin/identities` for
  `pbt-` tagged leftovers from runs killed by SIGKILL; decide where the key lives.

## Phase 5: Nightly CI (G3)

### Tasks

- [ ] **Workflow** — `.github/workflows/nightly-pbt.yml`: cron + `workflow_dispatch`
  (seed / runtime / command-count inputs), Redis service container, blade-runner build,
  time-budgeted `edgePbt` against **preview**, cleanup always.
- [ ] **Artifacts** — `command-trace.jsonl`, resolved spec + seed, per-replicant `agent.log`,
  `perfetto.json`, sync-state and digest diffs, tarred storage dirs.
- [ ] **Failure routing** (D13) — start with a red workflow + artifacts; decide on issue filing or
  Discord later.

## Backlog

- [ ] Chromium replicants / mixed node+browser fleets (`platform` already supports it).
- [ ] Edge restart / chaos actions (local edge only).
- [ ] Feed/queue objects coverage (v1 is documents only).
- [ ] Invitation-type matrix (interactive vs delegated, auth methods).
- [ ] Un-skip or fold in the two legacy fast-check stress tests once these patterns stabilize.
- [ ] Escalate if delete-wins (D5) turns out not to hold under concurrent edit-vs-delete.
