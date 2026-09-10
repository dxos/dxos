# blade-runner-edge-stress — Tasks

Randomized, model-checked end-to-end test of real clients replicating through EDGE, in the
blade-runner harness. Spec + decisions: [DESIGN.md](./DESIGN.md); what was measured:
[RESULTS.md](./RESULTS.md).

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

## Phase 1: Local-edge MVP (G1) — DONE

- [x] **`ClientReplicant`** (`src/replicants/client-replicant.ts`) — real `Client` over
      `LocalClientServices`, persistent storage under `outDir`, the JSON-only RPC surface in
      DESIGN.md §4, `@trace.span()` on each verb, registered with `ReplicantRegistry`.
- [x] **Verify the offline/online mechanism** (DESIGN.md §15.1) — the predicted approach does not
      work: the connection is built with `deferConnect`, so a reopened one never dials again. Each
      replicant cuts a loopback TCP proxy in front of EDGE instead, started only when `partitions`
      is on. The SDK defect (an `EdgeClient` cannot be restarted once closed) stands — RESULTS.md §3.
- [x] **Fixture setup** — `devicesPerIdentity` builds the fleet (default 5 identities / 6 clients),
      HALO device invitations for the sibling pairs, an EDGE agent per identity. Agent creation is
      best-effort: a deployed environment can refuse it, and a run that cannot get one says so in
      the summary rather than failing.
- [x] **`EdgeStress` plan** (`src/spec/edge-stress/`, registered as `edgeStress` in `main.ts`) —
      spawn the fleet, run the command list, final stabilization + digest comparison.
- [x] **Assertions** — quiescence vs the edge peer, cross-device digest equality, model equality
      (DESIGN.md §9), each with its own explicit timeout (there is no RPC timeout).
- [x] **Run green against local edge** — RESULTS.md §1 is the run book; runs F and G execute the
      full sequence. What remains red is finding 6, a product defect, not a harness one.

## Phase 2: Schema-driven generation (G1)

- [x] **Model + operations** — the vocabulary is one `Schema.Union` of `TaggedStruct`s and the
      generator is `Schema.toArbitrary(...)(FastCheck)`; an interpreter (`canRun`/`execute`) adapts
      each drawn command with a model-only precondition. Per-identity membership, per-client
      digests, tri-state client status.
- [x] **Seeded runner** — `--seed` through `GlobalOptions` into `FastCheck.sample`;
      `command-trace.jsonl` written per run, with the drawn plan recorded before execution. Note
      `FastCheck.assert` is NOT usable here: it biases its first run to ~2 commands (RESULTS.md §3).
- [x] **Checkpoint command** — mid-run quiesce + assert over online members only.
- [x] **Soak shape** — a wall-clock budget checked before each command, and a best-of-`sampleDraws`
      draw scored by data operations. Shrinking stays unavailable: minimizing a counterexample means
      re-running sequences against a freshly rebuilt fleet, hours per failure. Revisit if an
      in-process transport lands.
- [ ] **Burn-in** — repeated seeds against preview; every failure either gets fixed or becomes a
      deterministic regression case. Blocked on finding 6, which fails most full-length runs.

## Phase 3: Deployed EDGE (G2) — DONE

- [x] **`edge` target** — `'local' | 'dev' | 'preview'`, one `urlsFor` deriving `edgeUrl` and the
      hub URL from `EDGE_URLS`. The nightly runs against **preview**: a local `wrangler dev` stack
      500s on `/db/spaces/:id/join` under six peers and a hundred objects, and with its tail-logger
      unconnected each successive joiner measures slower than the last, so a local run measures
      wrangler rather than EDGE.
- [x] **Scale run against preview** — the nightly shape executed by hand and then in CI, with
      artifacts collected. Numbers in RESULTS.md.
- [x] **Run book** — RESULTS.md §1, covering local EDGE, deployed EDGE, and the Depot workflow.

## Phase 4: Cleanup — DONE

- [x] **Verify VP-auth self-deletion works for a fresh test identity** (DESIGN.md §15.2) — proven
      against local, dev and preview. The `/data/*` routes reject identities not bound to a Hub
      account with 403, which the `test+*@dxos.org` hatch resolves; dxos/edge#1026 opened that hatch
      on preview by moving it onto its own `isTestAccountEnvironment` rather than widening
      `isDevLikeEnvironment`.
- [x] **Run-scoped teardown** — in the plan's own `finally`, so it runs after a failed assertion,
      plus a SIGTERM handler: a CI job timeout kills the process without unwinding, which is exactly
      how a shared environment accumulates orphans.
- [x] **No admin fallback** — self-serve only, by decision. A shared secret that can delete anything
      is not something a test should carry, and it would mask the case this cleanup exists to prove.
      `assertCanCleanUp` refuses any target without the hatch rather than leak, so pointing a run at
      staging or production fails before it creates anything.
- [ ] **Typed client methods** — add the data-management routes to `EdgeHttpClient`
      (`packages/core/mesh/edge-client`). The framework calls them with `fetch` today; typing them
      belongs in the SDK, not here.

## Phase 5: Nightly CI (G3) — DONE

- [x] **Workflow** — `.depot/workflows/edge-nightly.yml` (Depot, not GitHub Actions): cron +
      `workflow_dispatch` with edge/objects/joiners/minutes/commands inputs, a Redis service
      container, and two independent jobs so a red soak does not withhold a latency number.
- [x] **Artifacts** — `summary.md`, `join-latency.json`, `command-trace.jsonl`, `perfetto.json`,
      per-replicant logs and storage, uploaded with `if: always()`.
- [x] **Failure routing** (D13) — a red workflow plus artifacts, as decided. Issue filing or Discord
      stays deferred.

## Follow-ups

- [ ] **`POST /identity/agents/create` failing on preview (2026-09-10 nightly, ongoing)** — both
      jobs died in fleet setup with `AgentProvisioningError` / `createAgent` HTTP 500, before either
      measurement ran. SigNoz shows an EDGE-preview outage in `dxos/edge`'s `identity-service`,
      onset ~2026-09-09 22:00–23:00 UTC, still failing near-100% as of the writeup. Not this repo's
      code — RESULTS.md §7b has the evidence; owned by `dxos/edge`. Re-check the next nightly; if the
      failure signature has changed, the outage has cleared and whatever failure remains is worth a
      fresh look.
- [ ] **Finding 6** — a document is discovered but never delivered; five reproductions, two of them
      in CI, one in the edge repo's own `automerge.node.test.ts`. This is what keeps the nightly soak
      red, and it is a product defect, not a harness one.
- [ ] **Finding 5** — `EdgeFeedReplicator`'s async `append` listener leaks an unhandled rejection,
      which is why `partitions` defaults to `false`. Un-defaulting it depends on that fix.
- [ ] **Invitation latency** — the invitation half quantizes near 60s at 100 objects and is ~19s at
      the low end; the corrected invitation/replication split now attributes it, so the next run
      decides whether it is the exchange or the space loading.

## Backlog

- [ ] Chromium replicants / mixed node+browser fleets (`platform` already supports it).
- [ ] Edge restart / chaos actions (local edge only).
- [ ] Feed/queue objects coverage (v1 is documents only).
- [ ] Invitation-type matrix (interactive vs delegated, auth methods).
- [ ] Un-skip or fold in the two legacy fast-check stress tests once these patterns stabilize.
- [ ] Escalate if delete-wins (D5) turns out not to hold under concurrent edit-vs-delete.
