# blade-runner-edge-stress — Randomized model-based EDGE sync test — Design

Status: **design approved** (review answers 2026-08-27, recorded in §17). Remaining unknowns are
implementation-verification items in §15, not open design questions.

## 1. Goal

A randomized, **model-based** end-to-end test: a fleet of real `@dxos/client` peers replicating
through EDGE, driven by [fast-check](https://fast-check.dev/docs/core-blocks/runners/) stateful
("commands") testing inside the blade-runner harness. Random interleavings of
online/offline/restart, space creation and joining, and document create/edit/delete are generated
from a seed; a plain in-memory model tracks intended state; the main assertion is that after
stabilization **every peer converges to the same state and that state equals the model** — full
replication, no loss, no duplication, no resurrection of deleted documents.

Staged goals:

- **G0 — Design** (this document). ✅
- **G1 — Running against local EDGE** (edge repo: `moon run edge:dev` → `http://localhost:8787`).
- **G2 — Runnable locally against the deployed preview EDGE** (`https://preview.dxos.network`).
- **G3 — Nightly on CI, against preview only** (no edge build in CI).

Cleanup of everything a run creates is **required before G3 turns on** and is specified in §13.

## 2. Prior art (what we reuse)

| Piece | Where | What we take |
| --- | --- | --- |
| blade-runner harness | `packages/e2e/blade-runner` | Scheduler/replicant model (§3). |
| `EdgeReplicant` | `src/replicants/edge-replicant.ts` | Real `Client` + edge config, persistent storage under `outDir`, agent creation, `waitForReplication`. |
| `ReplicationTestPlan` | `src/spec/replication.ts` | N-replicant topology bookkeeping. |
| fast-check model runs | `teleport-extension-replicator/src/stress.test.ts`, `client-services/.../pipeline-stress.test.ts` | `fc.commands` + `fc.asyncModelRun` shape: `check(model)` preconditions, `run(model, real)`, Model/Real split, explicit `examples`. Both are `test.skip` today — this project is their successor at the client↔EDGE level. |
| Real-client invitations | `packages/sdk/client-e2e/src/spaces-invitations*.test.ts`, `performInvitation` (`@dxos/client-services/testing`) | Interactive + delegated multi-use invitations that survive the original host going away. |
| Manual edge e2e | `packages/sdk/client/test/e2e/sync.test.ts`, `edge-recovery.test.ts` | Edge quiescence predicate (`isEdgePeerId` peer with `missingOnRemote = missingOnLocal = differentDocuments = 0`), `setEdgeReplicationPreference(ENABLED)`, direct `LocalClientServices` construction. |
| Env presets | `packages/sdk/config/src/edge-services.ts` | `EDGE_URLS`: `local`, `dev`, `preview`, `production`. |
| Edge data-management API | edge repo `packages/services/edge/src/data-management/api.ts` | Space/identity deletion — both self-serve and admin (§13). |
| fast-check | `effect/testing` re-export (4.9.0) | No separate dependency: `effect` already ships it. |

## 3. Blade-runner architecture (what the implementation must fit into)

Read before writing code — these are the constraints that shape the whole test.

### 3.1 Two process roles

One **orchestrator** (the scheduler) and N **replicants**, each in its own OS process (node) or
browser page (chromium). One binary, `src/main.ts`, plays both roles:

- Normally it parses argv, picks a `TestPlan` from the `plans` map, and calls `runPlan`.
- If `process.env.DX_RUN_PARAMS` (node) or `globalThis.DX_RUN_PARAMS` (browser) is set, it instead
  calls `runReplicant` and becomes a replicant.

So **a new replicant class must be imported (and self-registered) from a module that the entry
bundle reaches**, or the child process cannot construct it (§3.3).

### 3.2 Orchestrator lifecycle (`plan/run-plan.ts`)

`runPlanner` →
`testId = new Date().toISOString().replace(/\W/g,'-')` →
`outDir = ${GRAVITY_OUT_BASE ?? cwd}/out/results/${testId}` →
optional browser bundle build →
`new SchedulerEnvImpl(options, testProps).open()` →
`plan.run(schedulerEnv, testProps)` →
`schedulerEnv.close()` (kills every replicant with SIGTERM) →
`analyzeResourceUsage` →
`plan.analyze?.()` →
writes `test.json` (the run summary: spec, options, results, stats, replicant table) →
`process.exit(0)`.

Consequences for us:

- **A throw from `plan.run` is caught**, logged, `schedulerEnv.close()` runs, and the process exits
  **1**. So an assertion failure already produces a non-zero exit and kills replicants — but any
  cleanup we need beyond killing processes (§13) must be inside `plan.run`'s own `try/finally`,
  because nothing plan-specific runs after the throw.
- `options.randomSeed && seedrandom(options.randomSeed, { global: true })` already seeds `Math.random`
  **globally in the orchestrator only** — replicants are separate processes and are *not* seeded.
- `analyze()` receives `(params, replicantsSummary, result)` — note `run-plan.ts`'s repeat-analysis
  path calls it with only two arguments, a latent inconsistency; don't depend on that path.

### 3.3 Replicants (`plan/run-replicant.ts`, `env/replicant-*.ts`)

- `ReplicantRegistry.instance.register(Class)` at module scope, keyed by `Class.name`; the child
  looks the class up by the `replicantClass` string in its params. **Registration is a side effect
  of importing the module**, hence §3.1.
- The child builds `ReplicantEnvImpl(params, DEFAULT_REDIS_OPTIONS)`, constructs
  `new Class(env)`, `env.setReplicant(instance)`, `env.open()`.
- Logs: node replicants install a file processor writing every level to
  `<outDir>/<replicantId>/agent.log`; browser replicants pipe through a Playwright-exposed function.
- Tracing: `registerPerfettoTracer()` in the replicant pipes `PERFETTO_EVENTS` into a Redis queue
  that the orchestrator muxes into `<outDir>/perfetto.json`. `@trace.span()` on a replicant method
  therefore shows up in the merged trace — worth putting on every RPC verb.
- `SIGINT`/`SIGTERM` → `process.exit`. There is **no graceful-shutdown RPC**; `replicant.kill()`
  from the orchestrator is a signal. Anything that must run before a replicant dies has to be an
  explicit RPC call we make first.

### 3.4 RPC (`env/replicant-rpc-handle.ts`, `env/replicant-rpc-server.ts`, `redis/util.ts`)

- `SchedulerEnvImpl.spawn(Class, runtime)` returns `{ brain, params, kill }`. `brain` is a
  `ReplicantRpcHandle` that **reflects over `Class.prototype`** and defines one async method per
  own/inherited property name, skipping `constructor` and anything starting with `_`.
  → **Public method = RPC verb. A `#private` or `_`-prefixed member is invisible to RPC.**
- Typed as `RpcHandle<T>`, which maps each method to its async form — so the plan gets full
  type-checking against the replicant class without a hand-written interface.
- Transport is two Redis lists per replicant (request/response queues) with blocking pops, wrapped
  in `@dxos/rpc`'s `RpcPeer` (`noHandshake: true`, `timeout: 0` on the orchestrator side —
  **no RPC timeout**, so a hung replicant hangs the plan; our own timeouts must be explicit).
- **The codec is `JSON.stringify`/`JSON.parse`** (`rpcCodec` in `redis/util.ts`). Therefore every
  argument and return value must be plain JSON: strings, numbers, booleans, arrays, objects.
  No `PublicKey`, no `Uint8Array`, no `Date`, no `undefined`-in-arrays semantics. Space ids travel
  as strings, keys as hex.
- `syncBarrier(key, n)` / `syncData(key, n, data)` exist on both sides (Redis `INCR` + keyspace
  notifications) for replicant-to-replicant rendezvous. Our design does not need them: the
  orchestrator sequences everything, which is what makes the model authoritative.

### 3.5 Process spawn and platforms

`runNode` / `runBrowser` (`plan/run-process.ts`, `plan/browser/browser-bundle.ts`); `platform` is
`'nodejs' | 'chromium' | 'firefox' | 'webkit'`. Browser replicants need the esbuild bundle built
first (`--browser`, on by default). We start node-only (§11).

### 3.6 Redis

Required infrastructure — the orchestrator and every replicant connect to Redis (default port
6379). `SchedulerEnvImpl` also sets `notify-keyspace-events AKE`. In CI it is a service container.

### 3.7 Invocation

`pnpm run-tests <plan>` = `moon run blade-runner:build && node ./dist/lib/node-esm/main.mjs <plan>`,
with `--specfile <yaml>` overriding `defaultSpec()`, `--repeatAnalysis <test.json>` re-running
analysis only, and `--headless` / `--browser` for browser runs.

## 4. This test's architecture

```
┌──────────────────────── orchestrator (node) ─────────────────────────┐
│ EdgeStress implements TestPlan<Spec, Result>                         │
│   FastCheck.sample(commands, { seed }) -> asyncModelRun              │
│   Model (plain JSON-shaped data)  +  command-trace.jsonl             │
└─────────────┬──────────────── RPC over Redis ──────────┬─────────────┘
              │                                          │
   ┌──────────▼──────────┐                    ┌──────────▼──────────┐
   │ ClientReplicant #1  │        ...         │ ClientReplicant #N  │
   │ real @dxos/client   │                    │ real @dxos/client   │
   │ persistent storage  │                    │ persistent storage  │
   └──────────┬──────────┘                    └──────────┬──────────┘
              └──────────────── WebSocket / HTTPS ───────┘
                                    ▼
                    EDGE  (local dev worker | preview.dxos.network)
```

- **New spec** `src/spec/edge-stress.ts`, registered in `main.ts` as `edgeStress`.
- **New replicant** `src/replicants/client-replicant.ts` — one real `Client` per replicant,
  deliberately dumb: every verb is a small JSON-in/JSON-out method. All decision-making
  (generation, model, preconditions, assertions) lives in the orchestrator, so there is exactly
  one model and one place that can be wrong.
- Generation runs **in the orchestrator**. The operation vocabulary is one Effect
  `Schema.TaggedUnion` and the generator is `Schema.toArbitrary(...)(FastCheck)`; an interpreter
  adapts each drawn command to `FastCheck.AsyncCommand<Model, Real>` whose `check(model)` is pure
  (fast-check requires purity there) and whose `run(model, real)` mutates the model and drives
  replicants over RPC.

### ClientReplicant RPC surface (draft — all JSON-serializable)

```
// Lifecycle.
init({ config })                                   // build LocalClientServices + Client, initialize
destroy()                                          // client.destroy(); process and storage survive
goOffline()                                        // services.host.edgeConnection.close()   — §6
goOnline()                                         // services.host.edgeConnection.open(ctx) — §6

// Identity / devices.
createIdentity({ displayName }) -> { identityDid, deviceKey }
createAgent()                                      // EdgeAgentService.createAgent
inviteDevice() -> { invitationCode }               // host side of a HALO invitation
joinAsDevice({ invitationCode })                   // guest side; makes this client a 2nd device

// Spaces.
createSpace({ label }) -> { spaceId }              // + setEdgeReplicationPreference(ENABLED)
shareSpace({ spaceId }) -> { invitationCode }      // delegated, multiUse
joinSpace({ invitationCode }) -> { spaceId }
listSpaces() -> { spaceIds: string[] }

// Documents (ECHO objects).
createDocument({ spaceId, docId })
editDocumentText({ spaceId, docId, token })        // splice unique token into content
editDocumentCounter({ spaceId, docId, field })     // increment own single-writer counter
deleteDocument({ spaceId, docId })
flush({ spaceId })

// Observation.
getSyncState({ spaceId }) -> { connected, missingOnLocal, missingOnRemote, differentDocuments, unsynced }
digest({ spaceId }) -> { docs: { [docId]: { tokens: string[], counters: Record<string, number> } } }

// Teardown (§13).
deleteSpaceRemote({ spaceId })
deleteIdentityRemote()
```

## 5. Fleet and identity topology

Mixed, per decision D1 — both device-replication and invitation-through-edge are exercised in the
same run:

- **10 clients over 7 identities** (default): 3 identities own 2 devices each (6 clients), 4
  identities own 1 device each (4 clients).
- Device siblings are joined via a HALO invitation at setup; they receive spaces through **HALO
  replication**, with no space invitation involved.
- Distinct identities receive spaces through **delegated multi-use space invitations over edge
  signaling** — the path we most want hammered.
- **Every identity creates an edge agent** (D11). The agent is an always-online member device, so a
  pending join can be admitted even when every user device of every member identity is offline.
- Membership in the model is therefore tracked **per identity**; digests are collected **per
  client (device)**. "Fully replicated" means every device of every member identity agrees.

## 6. Client config and the three client states

Config: `edgeFeatures.subductionReplicator: true`, `signaling: true`, `agents: true`, and
**no client↔client data path** (D7 — edge-only data replication; signaling exists for invitations).
Persistent storage per client at `<outDir>/<replicantId>/storage`, so a destroyed client recovers
from disk. `space.internal.setEdgeReplicationPreference(ENABLED)` on every created space.

A client is in exactly one of three states, and the distinction is the point of D6:

| State | Process | Edge link | Can act locally | Mechanism |
| --- | --- | --- | --- | --- |
| `online` | up | connected | yes | — |
| `offline` | up | severed | **yes — edits accumulate locally** | `host.edgeConnection.close()` |
| `down` | client destroyed | n/a | no | `client.destroy()` |

`LocalClientServices.host` is public (`packages/sdk/client/src/services/local-client-services.ts:175`)
and `ClientServicesHost.edgeConnection` is a public getter over an `EdgeClient`
(`packages/sdk/client-services/src/packlets/services/service-host.ts:387`), which is a `Resource`
with `open(ctx)` / `close()`. So offline/online needs **no proxy and no monkey-patching** — but see
the reconnect hazard in §15.1.

## 7. The model

Plain data in the orchestrator; no CRDT internals modeled.

```ts
type Model = {
  identities: Map<IdentityId, { devices: ClientId[]; agent: boolean }>;
  clients: Map<ClientId, { identity: IdentityId; state: 'online' | 'offline' | 'down' }>;
  spaces: Map<SpaceId, {
    members: Set<IdentityId>;         // joined
    pending: Set<IdentityId>;         // will join on next opportunity (D2 — eventually joins)
    docs: Map<DocId, {
      deleted: boolean;
      tokens: Set<string>;            // unique tokens spliced into content
      counters: Map<ClientId, number>;// single-writer registers
    }>;
  }>;
  opSeq: number;
};
```

**Why edits are encoded this way** (D4 — "whatever works best"). "Model equals system" is
undecidable for arbitrary concurrent text edits without re-implementing the CRDT merge. Instead
every edit is order-insensitive and individually verifiable:

- *Text edit* = splice the unique token `⟦c<clientId>-<opSeq>⟧` at a pseudo-random position.
  Assertion: final content contains **each model token exactly once** (catches loss *and*
  duplication) and contains nothing but model tokens (catches corruption and resurrection).
- *Counter edit* = increment field `counter_<clientId>`. Only that client ever writes that field,
  so the model knows the exact final value regardless of merge order.

Exact model equality, while the real text CRDT still does real concurrent merges underneath.

Documents are **ECHO objects** (D3) — a small `Type.makeObject` schema in the replicant module
(`content: string` plus counter fields), mirroring the existing `Text` type in `edge-replicant.ts`.
No Composer types: they add plugin dependencies and change nothing about sync behavior.

## 8. Actions (fast-check commands)

Preconditions are evaluated on the **model only**; fast-check discards a command whose `check`
fails at that point in the sequence.

| Action | Precondition (model) | Model effect | System effect |
| --- | --- | --- | --- |
| `GoOffline(c)` | `state(c) = online` | `state(c) := offline` | `goOffline()` |
| `GoOnline(c)` | `state(c) = offline` | `state(c) := online`; resolve pending joins for `identity(c)` | `goOnline()`; redeem stored invitations |
| `Restart(c)` | `state(c) ≠ down` | `state(c) := online`; resolve pending joins | `destroy()` then `init()` (recovers from disk) |
| `CreateSpace(c)` | `state(c) = online ∧ |spaces| < maxSpaces` | new space; `members := {identity(c)}`; every other identity → `pending` | `createSpace()` + `shareSpace()`; orchestrator stores the invitation code |
| `JoinSpace(c, s)` | `state(c) = online ∧ identity(c) ∈ pending(s) ∧ ∃ online admitting device` | move identity `pending → members` | `joinSpace(code)` |
| `CreateDocument(c, s)` | `state(c) ≠ down ∧ identity(c) ∈ members(s) ∧ docs(s) < maxDocs` | add empty doc | `createDocument()` |
| `EditText(c, s, d)` | `state(c) ≠ down ∧ member ∧ exists(d) ∧ ¬deleted(d)` | `tokens(d) += tok` | `editDocumentText()` |
| `EditCounter(c, s, d)` | as `EditText` | `counters(d)[c] += 1` | `editDocumentCounter()` |
| `DeleteDocument(c, s, d)` | as `EditText` | `deleted(d) := true` | `deleteDocument()` |
| `Checkpoint` | ≥1 online client | — | quiesce + assert §9-B (D14) |

Notes:

- Document actions require only `state(c) ≠ down`, so an **offline** client edits into its local
  database and the changes replicate when it comes back — the coverage D6 asked for.
- The admitting device for a join is any online device of a member identity, or that identity's
  **edge agent**, which is always online (§5).
- Delete-wins is the assumed semantics (D5): once the model marks a document deleted, it must be
  absent everywhere at the end, even if a concurrent edit was authored on a replica that had not
  yet seen the delete. If the system disagrees, that is a finding about the system to take to the
  ECHO/EDGE owners, not a test bug to paper over.

## 9. Assertions

- **A. Per-operation (local):** every RPC verb asserts its own local effect on the acting client
  (document present after create, counter incremented, absent after delete). Cheap, catches API
  breakage at the point of failure.
- **B. Checkpoint (mid-run, online members only):** for each space — every online member device
  flushes, then waits until its edge peer reports
  `missingOnRemote = missingOnLocal = differentDocuments = 0`, bounded by
  `quiescenceTimeoutMs` (timeout ⇒ **sync-stuck failure**, a real bug class). Then compare
  `digest(spaceId)` across those devices and against the model:
  1. all quiesced online devices' digests are **identical**;
  2. digest ⊆ model — nothing exists that the model does not know about;
  3. digest ⊇ every op authored by a client that is **currently online** — their work must have
     reached edge and therefore every quiesced peer. Ops authored by currently offline or down
     clients may legitimately be missing; that is the eventual-consistency window, not a defect.
- **C. Final (the main assertion — full replication):** bring every client to `online`, resolve
  every pending join, flush everywhere, quiesce every client against edge, then assert that every
  device of every member identity has a digest **identical to every other and exactly equal to the
  model**: same document set (deleted documents absent everywhere), equal token sets per document,
  equal counters per document.

## 10. Determinism, seed and run shape

- **Seed** comes from one CLI flag (`--seed`; today `GlobalOptions.randomSeed` is always
  `PublicKey.random().toHex()` and never settable). It feeds both `seedrandom` (existing global
  behavior) and `FastCheck.sample(..., { seed })`. The seed fixes the **generated command sequence**; it
  does not make a run bit-reproducible, because real network timing varies. The primary repro
  artifact is therefore the executed **command trace**, not the seed alone.
- **Shrinking** (D8 — the term explained): on failure fast-check normally re-runs the property many
  times with progressively smaller inputs to hand back a minimal failing case. Against a real
  deployed edge each replay costs minutes and can behave differently, so shrinking is **off** for
  the nightly job (`endOnFailure: true`): the nightly is a soak, and its output is the trace of what
  actually failed. Locally, `shrink: true` in the spec re-enables it for short sequences against
  local edge, where replays are cheap.
- **Nightly shape:** `numRuns` small, `maxCommands` large, `interruptAfterTimeLimit` set from
  `maxRuntimeMs` with `markInterruptAsFailure: false`, so exhausting the 60-minute budget ends the
  job green rather than red.
- Every executed command is appended to `command-trace.jsonl` in `outDir` (timestamp, command,
  args, duration, outcome).

## 11. Parameters (spec)

```ts
type EdgeStressSpec = {
  platform: Platform;                 // 'nodejs' for now
  edgeEnv: 'local' | 'preview' | { url: string };
  fleet: {
    identities: number;               // 7
    devicesPerIdentity: number[];     // [2,2,2,1,1,1,1] -> 10 clients
    agents: boolean;                  // true (D11)
  };
  maxSpaces: number;                  // 10
  maxDocumentsPerSpace: number;
  maxCommands: number;
  numRuns: number;
  maxRuntimeMs: number;               // 60 min nightly (D12)
  quiescenceTimeoutMs: number;
  weights: { goOffline; goOnline; restart; createSpace; joinSpace; createDocument; editText; editCounter; deleteDocument; checkpoint };
  shrink: boolean;
  seed?: string;
  cleanup: boolean;
};
```

Nightly defaults (D12): 10 clients / 7 identities / 10 spaces / 60-minute budget / node-only.

## 12. Environments

- **Local (G1/dev):** edge repo `moon run edge:dev` → `http://localhost:8787`, plus Redis
  (`redis-server --port 6379`). All state ephemeral; cleanup is deleting `outDir` and the local
  worker state.
- **Preview (G2/G3):** `https://preview.dxos.network`. Every run stamps what it creates:
  space labels and identity display names carry `edge-stress-<runId>`, and the SDK's
  `BaseHttpClientOptions.clientTag` (already used to classify traffic for metering, e.g. `ci-e2e`)
  is set to the same tag so runs are attributable server-side.
- **CI (G3):** preview only (D9) — no edge checkout, no edge build, no local worker.

## 13. Cleanup — IMPORTANT, deferred but blocking G3

Deferred by decision (D10) so it does not block G1/G2, but it **must land before the nightly is
enabled**: 60 minutes of soak against preview creates identities, agents, spaces and documents on
every run, and a nightly that leaks all of it is not shippable.

**The edge side already has the API** (verified in the edge repo at
`packages/services/edge/src/data-management/api.ts`, mounted at the worker root via
`api.route('/', dataManagementApi)` in `packages/services/edge/src/api.ts:86`). Two paths:

**A. Self-serve, no secrets** — authenticated by the caller's own verifiable presentation:

| Endpoint | Authorization |
| --- | --- |
| `DELETE /data/space/:spaceId` | caller must be a member of the space |
| `DELETE /data/identity/:identity` | caller must be that identity (DID or hex key) |
| `GET /data/space/:spaceId`, `GET /data/identity/:identity` | same, for verification |

Deletion is **enqueued**, not synchronous — both answer `202`, so a cleanup pass must poll the
inspect endpoints rather than trust the response.

**B. Admin-key (`Authorization: Bearer`, `DX_HUB_API_KEY`)** — for sweeping what a crashed run left:

| Endpoint | Use |
| --- | --- |
| `GET /admin/spaces`, `GET /admin/identities` | leak detection (paged) |
| `DELETE /admin/spaces/:spaceId`, `DELETE /admin/identities/:identity` | delete regardless of membership |
| `POST /admin/selective-purge` | keep-list purge; destructive, dry-run supported |

The dxos-side client already supports both: `BaseHttpClient` mints VP auth headers from the client
identity, and `BaseHttpClientOptions.apiKey` sends an admin bearer instead — "for headless callers
(CI) that hold no HALO identity"
(`packages/core/mesh/edge-client/src/base-http-client.ts:30-50`). What is missing on the dxos side
is only a typed method on `EdgeHttpClient` for these routes.

Plan: **path A as the run's own `finally`** (each identity deletes its spaces and then itself — no
CI secret required at all), **path B as a periodic sweeper** keyed on the `edge-stress-` tag for runs that
died on SIGKILL and never reached their `finally`.

Risk to verify first (§15.2): the `/data/*` routes authenticate with
`lookupAccount: accountLookupViaHubService()`, and identities not bound to a Hub account are
rejected `403`. A freshly created throwaway test identity may not be bound, which would make path A
unusable and promote path B (and its CI secret) to primary.

## 14. Nightly CI (G3)

New `.github/workflows/nightly-edge-stress.yml` — this repo has no nightly test workflow today (only
`deploy-apps.yml` carries a cron).

- `schedule:` nightly cron + `workflow_dispatch` with `seed`, `maxRuntimeMs`, `maxCommands` inputs.
- Redis as a service container.
- No edge provisioning: the job targets deployed **preview** (D9).
- Steps: build blade-runner → run `edgeStress` with the nightly spec and a random seed →
  **always** run the cleanup phase → upload artifacts.
- Artifacts (always on failure, optionally on success): `command-trace.jsonl`, the resolved spec +
  seed, per-replicant `agent.log`, `perfetto.json`, final sync-state and digest diffs, and
  (size permitting) tarred client storage directories.
- Failure routing (D13) is deferred: red workflow + artifacts to start; issue-filing or Discord
  later.

## 15. Verification items found during design

Concrete things the implementation must confirm or fix — found by reading the source, not guessed.

1. **`EdgeClient` reconnect after `close()` is likely broken for our use.** `startNetworking()` is
   guarded by `_networkingStarted`, which `_close()` never resets
   (`packages/core/mesh/edge-client/src/edge-client.ts:105,229,232` and its `_close`). So
   `close()` → `open()` re-registers metrics but `startNetworking()` no-ops and the socket is never
   re-dialed. Expect to need a one-line SDK fix (reset the flag in `_close`, or dial explicitly on
   reopen) — a latent bug in its own right, since it makes edge connections non-restartable.
   Fall back to destroy+init for offline/online only if that fix proves unsafe.
2. **VP auth against a Hub account** — §13's risk; test one `DELETE /data/space/:spaceId` from a
   freshly minted identity against preview before committing to path A.
3. **RPC is JSON-only** (§3.4) — no `PublicKey`/`Uint8Array` may cross the replicant boundary.
4. **No RPC timeout on the orchestrator** (`timeout: 0`) — every wait we care about (quiescence,
   join, flush) needs its own explicit timeout, or a hung replicant hangs the whole run.
5. **`plan.run` is the only place cleanup can run** (§3.2) — put it in `try/finally` there;
   nothing plan-specific executes after a throw escapes.
6. **Agent creation cost** — `EdgeReplicant.startAgent` calls `EdgeAgentService.createAgent` with a
   10s timeout; 7 identities each creating an agent at setup is the slowest part of the fixture.
   Measure and consider parallelizing setup.

## 16. Failure artifacts and repro

A failure bundle must answer "what happened" without a rerun: the command trace up to the failing
assertion, the model-vs-client digest diff, every client's sync state at failure time, and each
client's `agent.log`. Rerunning with the same seed reproduces the same *sequence* (not the same
timing); the trace is what turns a nightly failure into a deterministic `examples: [...]` regression
case in the spec — the pattern the existing stress tests already use.

## 17. Decisions (review answers, 2026-08-27)

| # | Decision |
| --- | --- |
| D1 | **Mixed identity topology** — some clients are additional devices of one identity, others are distinct identities exercising invitations through edge. Both in the same run (§5). |
| D2 | **Eventually joins** — a client that could not join when a space was created joins at its next opportunity; the final phase forces all pending joins to resolve. |
| D3 | **ECHO objects** as the document type (not Composer types). |
| D4 | Edit encoding: whatever gives the strongest assertion — the unique-token + single-writer-counter design stands (§7). |
| D5 | Delete-wins is the assumed semantics; it is a distributed system, so this is an assumption to be validated, and a violation is a finding to escalate. |
| D6 | **Both** disconnect kinds: `client.destroy()` (down) *and* a severed transport with the process alive (offline), so **offline edits** are exercised (§6). |
| D7 | **Edge-only data replication.** |
| D8 | Nightly is a CI soak job — shrinking off there, available locally (§10). |
| D9 | **CI runs only against deployed preview edge** — no edge build in CI. |
| D10 | Cleanup deferred, marked **important**; the edge repo does have the deletion API (§13, verified). |
| D11 | **Every identity creates an edge agent.** |
| D12 | Nightly scale: **60 minutes, 10 spaces, 10 clients, some with 2 devices** (7 identities). |
| D13 | Failure routing decided later. |
| D14 | **Mid-run checkpoint assertions included.** |
