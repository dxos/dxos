# blade-runner-pbt — Property-based EDGE sync test — Design

Status: **draft for review** — open questions in §14 are numbered to match the review
conversation; record answers in §15 and fold them back into the sections they affect.

## 1. Goal

A randomized, **model-based** end-to-end test: a fleet of real `@dxos/client` peers
replicating through EDGE, driven by [fast-check](https://fast-check.dev/docs/core-blocks/runners/)
stateful ("commands") testing inside the blade-runner harness. Random interleavings of
connect/disconnect/create-space/create-edit-delete-document are generated from a seed; a plain
in-memory model tracks the intended state; the main assertion is that after stabilization **all
peers converge to the same state and that state equals the model** (full replication, no loss,
no duplication, no resurrection of deleted documents).

Staged goals:

- **G0 — Design** (this document).
- **G1 — Running against local EDGE** (`moon run edge:dev` in the edge repo → `http://localhost:8787`).
- **G2 — Runnable locally against the preview EDGE env** (`https://preview.dxos.network`),
  with **cleanup of everything the run created, on success and on failure**.
- **G3 — Nightly on CI** with failure artifacts good enough to investigate without a repro.

## 2. Prior art (what we reuse)

| Piece | Where | What we take |
| --- | --- | --- |
| blade-runner harness | `packages/e2e/blade-runner` | Scheduler/replicant model: orchestrator spawns replicants as separate node/chromium processes, RPC over Redis, per-replicant `agent.log`, perfetto traces, YAML spec files, `GlobalOptions.randomSeed` (already wired to `seedrandom` globally in `run-plan.ts`). |
| `EdgeReplicant` | `src/replicants/edge-replicant.ts` | Real `Client` + edge config, persistent storage under `outDir`, `waitForReplication` via `subscribeToAutomergeSyncState`. |
| `ReplicationTestPlan` | `src/spec/replication.ts` | N-replicant topology bookkeeping. |
| fast-check model runs | `teleport-extension-replicator/src/stress.test.ts`, `client-services/src/packlets/pipeline/pipeline-stress.test.ts` | `fc.commands` + `fc.asyncModelRun` shape: `check(model)` preconditions, `run(model, real)`, Model/Real split, explicit `examples`. Both are `test.skip` today — this project is their production-ready successor at the client↔EDGE level. |
| Real-client invitations | `packages/sdk/client-e2e/src/spaces-invitations*.test.ts`, `performInvitation` (`@dxos/client-services/testing`) | Invitation flows incl. delegated multi-use invitations that survive the original host going away. |
| Manual edge e2e | `packages/sdk/client/test/e2e/sync.test.ts`, `edge-recovery.test.ts` | Edge sync quiescence predicate: the edge peer (`isEdgePeerId`) reports `missingOnRemote === 0 && missingOnLocal === 0 && differentDocuments === 0`; `setEdgeReplicationPreference(ENABLED)` per space. |
| Env presets | `packages/sdk/config/src/edge-services.ts` | `EDGE_URLS`: `local` (`http://localhost:8787`), `dev`, `preview` (`https://preview.dxos.network`), `production`. |
| fast-check | catalog `^3.19.0` | Already a workspace catalog dep. |

## 3. Architecture

```
┌────────────────────────────── orchestrator (node) ──────────────────────────────┐
│  EdgePbt TestPlan (src/spec/edge-pbt.ts)                                        │
│  fast-check: fc.assert(fc.asyncProperty(fc.commands([...]), run))               │
│  Model (plain TS data) + command trace log                                      │
└──────────────┬──────────────────RPC over Redis─────────────────┬────────────────┘
               │                                                 │
   ┌───────────▼───────────┐                         ┌───────────▼───────────┐
   │ ClientReplicant #1    │           ...           │ ClientReplicant #N    │
   │ real @dxos/client     │                         │ real @dxos/client     │
   │ persistent storage    │                         │ persistent storage    │
   └───────────┬───────────┘                         └───────────┬───────────┘
               │              WebSocket / HTTP                   │
               └───────────────────┬─────────────────────────────┘
                                   ▼
                          EDGE (local | preview)
```

- **New spec** `src/spec/edge-pbt.ts` (`EdgePbt implements TestPlan<EdgePbtSpec, EdgePbtResult>`),
  registered in `main.ts` as `edgePbt`.
- **New replicant** `src/replicants/client-replicant.ts`: wraps one real `Client`. Dumb by
  design — every verb is a small RPC method; all decision-making (generation, model,
  preconditions, assertions) lives in the orchestrator so there is exactly one model.
- fast-check runs **in the orchestrator**. Commands implement `fc.AsyncCommand<Model, Real>`:
  `check(model)` is pure on the model (fast-check requires this for generation and shrinking);
  `run(model, real)` applies the effect to the model and drives the replicant over RPC.
- `Real` holds the replicant handles plus run bookkeeping (space invitations, created spaceIds
  for cleanup, per-client data roots).

### ClientReplicant RPC surface (draft)

```
init({ config })                      // create + initialize Client (persistent storage under outDir)
destroy()                             // client.destroy() — process stays alive, storage stays
createIdentity() -> { did }
createSpace({ name }) -> { spaceId, invitationCode }   // spaces.create + edge replication ENABLED + delegated multi-use invitation
joinSpace({ invitationCode, spaceId })
createDocument({ spaceId, docId }) -> void             // Obj.make(Text, { content: '' }) with deterministic id
editDocumentText({ spaceId, docId, token, position })  // splice unique token into content
editDocumentCounter({ spaceId, docId })                // increment own single-writer counter field
deleteDocument({ spaceId, docId })                     // db.remove(obj)
flush({ spaceId })
getSyncState({ spaceId }) -> edge-peer sync summary
digest({ spaceId }) -> { docs: { [docId]: { tokens: sorted string[], counters: {...}, } }, deletedAbsent: true }
```

## 4. System under test — client config

- `edgeFeatures.subductionReplicator: true` (+ `feedReplicator` — pending Q7 scope),
  `signaling: true` (invitations need it). Data replication path is **edge-only** for v1:
  no client↔client WebRTC data channel, so EDGE is the hub under test (Q7).
- Persistent storage per client (`dataRoot: <outDir>/<replicantId>/storage`) so
  disconnect = `destroy()` and reconnect = `init()` recovers from disk (Q6).
- `space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED)` on every
  created space (mirrors `sync.test.ts`).
- No edge agent by default (`sync.test.ts` replicates without one) — pending Q11.

## 5. The model

Plain data in the orchestrator; no CRDT internals modeled.

```ts
type Model = {
  clients: Map<ClientId, {
    online: boolean;
    member: Set<SpaceId>;       // joined
    pendingJoin: Set<SpaceId>;  // invited (space existed while client offline), not yet joined
  }>;
  spaces: Map<SpaceId, {
    docs: Map<DocId, {
      deleted: boolean;
      tokens: Set<string>;                 // unique tokens spliced into content
      counters: Map<ClientId, number>;     // single-writer counters
    }>;
  }>;
  opSeq: number;   // global sequence for unique token/doc ids
};
```

**Why edits are encoded this way.** "Model equals system" is undecidable for arbitrary
concurrent text edits without re-implementing the CRDT merge. Instead every edit is designed
to be **order-insensitive and individually verifiable**:

- *Text edit* = splice the unique token `⟦c<clientId>-<opSeq>⟧` at a pseudo-random position.
  The model records the token in a set. Assertion: the final content contains **each model
  token exactly once** (catches loss *and* duplication) and consists of nothing but model
  tokens (catches corruption/resurrection).
- *Counter edit* = increment `counter_<clientId>` on the document. Only that client ever
  writes that field (single-writer register), so the model knows the exact final value.

This gives exact model equality without predicting merge order, while still exercising real
concurrent text-CRDT merges underneath.

## 6. Actions (fast-check commands)

Preconditions are evaluated on the **model only** (`check(model)`); fast-check discards
commands whose precondition fails at that point in the sequence.

| Action | Precondition (model) | Model effect | System effect |
| --- | --- | --- | --- |
| `Connect(c)` | `¬online(c)` | `online(c) := true`; for each `s ∈ pendingJoin(c)` with ≥1 online member: move to `member(c)` | `init()`; redeem stored invitation per joined space |
| `Disconnect(c)` | `online(c)` | `online(c) := false` | `destroy()` (storage persists) |
| `CreateSpace(c)` | `online(c) ∧ |spaces| < maxSpaces` | add space; `member(c) += s`; every other online client with ≥… → `member`; offline clients → `pendingJoin` | `createSpace()`; online clients `joinSpace()` via delegated multi-use invitation; invitation code retained in `Real` for late joiners |
| `CreateDocument(c, s)` | `online(c) ∧ member(c,s) ∧ docCount(s) < maxDocsPerSpace` | add doc (empty) | `createDocument()` |
| `EditText(c, s, d)` | `online(c) ∧ member(c,s) ∧ exists(d) ∧ ¬deleted(d)` | `tokens(d) += tok` | `editDocumentText()` |
| `EditCounter(c, s, d)` | same as EditText | `counters(d)[c] += 1` | `editDocumentCounter()` |
| `DeleteDocument(c, s, d)` | `online(c) ∧ member(c,s) ∧ exists(d) ∧ ¬deleted(d)` | `deleted(d) := true` | `deleteDocument()` |
| `Checkpoint` | ≥1 online client | — | quiesce online members ↔ edge, assert §7-B |
| `RestartClient(c)` *(optional, Q6)* | `online(c)` | — | `destroy()` + `init()` back-to-back (crash recovery) |

Notes:

- **"Everybody joins" with offline clients (Q2):** a client that is offline when a space is
  created cannot join at that moment. Proposed semantics: it joins automatically on its next
  `Connect`, provided the model shows at least one online member to admit it (delegated
  multi-use invitation held by the orchestrator); otherwise the join stays pending until a
  later `Connect`. The final stabilization phase (§7-C) reconnects everyone, so every client
  ends up a member of every space.
- Edits/creates while *other* peers are offline are the interesting case and are fully
  allowed; the acting client itself must be online in v1 (its process is down when
  "offline", since disconnect = destroy). If Q6 lands on a network-only toggle, the acting
  client may also edit while offline — a strictly richer test we can enable later.
- Per the user's constraints: edit/delete only target documents that exist in the model and
  are not deleted in the model. Concurrent edit-vs-delete races still occur in the real
  system (an edit lands on a replica that hasn't seen the delete yet) — expected semantics
  pending Q5.

## 7. Assertions

- **A. Per-operation (local):** each RPC verb asserts its own local effect on the acting
  client (document visible in local query after create, counter incremented, doc absent
  after delete). Cheap, catches API breakage immediately, and doubles as the "operation has
  effect on the system" half of the model/system pairing.
- **B. Checkpoint (mid-run, online members only):** for each space: every online member
  flushes, then waits until its edge-peer sync state reports
  `missingOnRemote = missingOnLocal = differentDocuments = 0` (bounded by a timeout —
  timeout ⇒ **sync-stuck failure**). Then every online member returns `digest(spaceId)` and
  we assert:
  1. all online members' digests are **identical**;
  2. digest ⊆ model (nothing the model doesn't know about);
  3. digest ⊇ every op authored by a **currently-online** member (their ops must have
     reached edge and therefore every quiesced online member). Ops authored by currently
     offline clients may legitimately be missing — this is the eventual-consistency window.
- **C. Final (main assertion — full replication):** reconnect every client, resolve all
  pending joins, flush everywhere, quiesce all clients against edge (same predicate as B),
  then assert every client's digest of every space is identical **and equals the model
  exactly**: same document set (deleted docs absent everywhere), per-document token sets
  equal, per-document counters equal.

## 8. Determinism, seed, shrinking

- **Seed** flows from one CLI flag (`--seed`, new; today `GlobalOptions.randomSeed` is
  always `PublicKey.random().toHex()`) into (a) `seedrandom` global (existing behavior) and
  (b) `fc.assert(..., { seed })`. The seed fully determines the generated command sequence;
  it does **not** make the run bit-reproducible (real network/timing), so the primary repro
  artifact is the executed **command trace**, not the seed alone.
- **Soak mode (nightly):** few long sequences (`numRuns` small, `maxCommands` large),
  `endOnFailure: true` (no shrinking — replaying against a real edge is too slow and too
  nondeterministic to shrink usefully), `interruptAfterTimeLimit: maxRuntime` with
  `markInterruptAsFailure: false` so hitting the time budget ends the soak green.
- **Dev mode (local):** short sequences with shrinking enabled — each property run gets a
  fresh fleet (new identities, new spaces), so replays are independent; against local edge
  this is fast enough to be useful.
- Every executed command is appended to `command-trace.jsonl` (timestamp, command, args,
  duration, outcome) in the run's `outDir` — the primary debugging artifact.

## 9. Parameters (spec)

```ts
type EdgePbtSpec = {
  platform: Platform;              // 'nodejs' first; 'chromium' later (backlog)
  edgeEnv: 'local' | 'preview' | { url: string };
  maxClients: number;              // fleet size (all spawned up front; "connected" is dynamic)
  maxSpaces: number;
  maxDocumentsPerSpace: number;
  maxCommands: number;             // sequence length upper bound
  numRuns: number;                 // fresh-fleet property executions
  maxRuntimeMs: number;            // wall-clock budget (fc interruptAfterTimeLimit)
  quiescenceTimeoutMs: number;     // per checkpoint/final sync wait
  weights: {                       // command mix
    connect; disconnect; createSpace; createDocument; editText; editCounter; deleteDocument; checkpoint;
  };
  shrink: boolean;                 // dev mode vs soak mode
  seed?: string;                   // via --seed
  cleanup: boolean;                // §11; default true for edgeEnv != 'local'
};
```

Defaults for nightly pending Q12.

## 10. Environments

- **Local (G1):** developer (or CI job) runs the edge repo dev server —
  `moon run edge:dev` → `http://localhost:8787` — plus Redis for blade-runner
  (`redis-server --port 6379`). All state is ephemeral (local workerd + client temp dirs);
  cleanup is deleting `outDir`.
- **Preview (G2):** `https://preview.dxos.network` (preset `preview` in `EDGE_URLS`;
  `main.dxos.network` aliases it for clients in the field). Every run tags what it creates:
  space names/properties get `pbt-<runId>` and identity display names get the same prefix,
  so leaked resources are attributable and GC-able out-of-band. Whether creating
  spaces/agents on preview needs auth, and what server-side deletion exists, is Q10.
- **CI (G3):** §12.

## 11. Cleanup (preview runs)

Resources a run creates on EDGE: per-client identities/devices (HALO), optional edge agents
(Q11), spaces (durable objects + stored subduction/feed data), invitations.

Findings so far:

- `edge-client` exposes **no space-deletion API** (checked `EdgeHttpClient`); there is an
  admin-key auth scheme in `base-http-client.ts` (canonical `edgeAuth` admin-key form), so an
  admin cleanup endpoint is plausible on the edge side but not surfaced in this repo.
- `space.delete()` exists client-side and replicates a tombstone across devices of the
  identity (`client-e2e/src/space-delete.test.ts`) — whether EDGE reclaims the space's DO
  storage in response is unknown (edge-repo question).

Design (pending Q10): cleanup is a `finally` phase of the plan — it runs after success,
assertion failure, or timeout:

1. Best-effort client-side: reconnect one member per space, `space.delete()` every
   `pbt-<runId>` space.
2. Server-side (preferred, needs edge repo confirmation/work): admin endpoint to delete
   spaces / test-tenant data by id or by `pbt-<runId>` tag, called with an admin key from CI
   secrets.
3. Backstop: the `pbt-` naming convention allows a scheduled edge-side GC to reap anything a
   crashed run leaked (a run that dies with SIGKILL runs no `finally`).

## 12. Nightly CI (G3)

New workflow `.github/workflows/nightly-pbt.yml` (this repo has no nightly test workflow
today; only `deploy-apps.yml` has a cron):

- `schedule:` cron nightly + `workflow_dispatch` (with `seed`, `edgeEnv`, budget inputs).
- Redis as a service container.
- Edge provisioning: for the local-edge job, checkout `dxos/edge` @ main and run its dev
  server headless (needs cross-repo checkout token + its toolchain) — feasibility/ownership
  is Q9. The preview-env job needs no edge build but needs cleanup credentials (Q10).
- Run: build blade-runner, `node dist/.../main.mjs edgePbt --spec nightly.yml --seed $RANDOM_SEED`.
- Artifacts on failure (and optionally always): `command-trace.jsonl`, spec + seed, per-replicant
  `agent.log`, `perfetto.json`, final sync-state dumps, tarred client storage dirs.
- Failure routing pending Q13.

## 13. Failure artifacts & repro

A failure bundle must answer "what happened" without a rerun: the command trace up to the
failing assertion, the digests that differed (model vs per-client, diffed), the sync state of
every client at failure time, and each client's `agent.log`. Repro guidance: rerun with the
same seed reproduces the same *sequence* (not the same timing); the trace enables writing a
deterministic `examples: [...]` regression case in the spec (the pattern the existing stress
tests already use).

## 14. Open questions

Numbered to match the review conversation; answers land in §15.

1. **Identity topology** — one identity per client (spaces shared via invitations) vs all
   clients as devices of one identity (HALO replicates spaces, no invitations). Proposal:
   separate identities — invitation/membership over edge is part of what we want hammered.
2. **Late join semantics** — join-on-connect via stored delegated multi-use invitation,
   requiring ≥1 online member at that moment (else stays pending)? Or only join at space
   creation + final phase?
3. **Document type** — SDK-level `Text` object (as blade-runner uses today) vs Composer
   `DocumentType`. Proposal: SDK-level; Composer types add plugin deps, not sync behavior.
4. **Edit encoding** — accept the unique-token + single-writer-counter design (§5) as the
   basis for exact model equality? Arbitrary random edits would demote the assertion to
   pairwise convergence only.
5. **Edit-vs-delete race semantics** — what does ECHO/EDGE guarantee when an edit and a
   delete of the same document are concurrent (edit authored on a replica that hasn't seen
   the delete)? Delete wins (stays deleted) is the assumption baked into §5/§7; confirm.
6. **Disconnect semantics** — v1 `destroy()` + reinit from persistent storage (also covers
   crash recovery); is a network-only toggle (process alive, edge connection severed) worth
   adding, and is there a supported switch for it?
7. **Sync topology** — edge-only data replication (no client↔client WebRTC data path) for
   v1, signaling enabled only for invitations. Include `feedReplicator: true` or subduction
   only?
8. **Shrinking strategy** — soak mode without shrinking on nightly, shrink-enabled dev mode
   locally (§8). OK?
9. **Local edge in CI** — cross-repo checkout of `dxos/edge` + `moon run edge:dev` in the
   nightly workflow vs a published edge artifact/docker image vs running nightly only
   against preview. What's realistic, and should the nightly live in this repo or the edge
   repo?
10. **Preview cleanup mechanism** — what exists on the edge side today (admin delete-space
    endpoint? does `space.delete()` reclaim DO storage? TTL/test tenant?), and which of
    §11's options do we build? Does preview require auth for space/agent creation?
11. **Edge agents** — should identities create an edge agent (always-online member; helps
    late joins; more cleanup surface) or is agentless subduction replication the target
    configuration?
12. **Nightly scale defaults** — clients / spaces / docs-per-space / runtime budget /
    node-only vs mixed platforms.
13. **Failure routing** — red workflow + artifacts only, auto-filed GitHub issue, Discord
    webhook, or Trunk upload?
14. **Mid-run checkpoints** — include the `Checkpoint` command in the random mix (earlier
    localization, slower soak) or assert only at the end?

## 15. Decisions

*(recorded as review answers arrive)*
