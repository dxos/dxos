# blade-runner-edge-stress — Phase 1/2 results (local EDGE)

What was actually executed, in the Claude Code cloud sandbox against a locally built EDGE stack.
Design: [DESIGN.md](./DESIGN.md); ledger: [TASKS.md](./TASKS.md).

## Status

- **Reaches local EDGE and executes a real command sequence.** Orchestrator + 3 replicant
  processes, each a real `@dxos/client`, authenticate to a local EDGE worker stack, create
  identities, pair devices, share delegated invitations and replicate documents.
- **The generator is fixed** (§3). Runs used to plan 24 commands and execute 3–5, because the
  drawn sequence was state-blind and `asyncModelRun` discarded the rest in silence. A plan is now
  simulated against a pure model before anything is spawned, so what is recorded is what runs.
- **A full sequence now runs.** Run F executed all 25 commands — 21 of them data operations across
  2 spaces, 3 devices and 2 identities — and then failed its final convergence assertion. Every
  earlier stop was a modelling error in the test; those are fixed (§3). What is left is a product
  finding the SDK's own diagnostics corroborate (finding 6).
- **Finding 6 is real, not version skew.** The local workers were resolving `@dxos/*` from a
  catalog pinned 54 commits behind this branch. After `pnpm link-packages ../dxos --all --install`
  they run this checkout, and run G reproduced run F's failure exactly. See §6.

## 1. Run book (local EDGE)

Two repos, side by side: `dxos/dxos` and `dxos/edge`.

```bash
# 1. EDGE (in the edge repo) — build first, or the workers fail to resolve @dxos/edge-*.
moon run :build
node scripts/dev-env.mjs --skip-secrets     # writes .env; no 1Password needed
node scripts/stack.mjs migrate

# The VP auth challenge is empty without a server keypair, and every authenticated request 401s.
# PUBLIC_DEV_SERVER_KEYPAIR (packages/sdk/hub-protocol/src/server-keypair.ts) is checked in for
# exactly this; `--skip-secrets` does not write it.
#   echo "DX_HUB_SERVICE_KEYPAIR=<PUBLIC_DEV_SERVER_KEYPAIR>" >> packages/services/<svc>/.env

# Start the group. Do NOT use `pnpm stack:start` here: it includes ai-service, which needs
# CLOUDFLARE_API_TOKEN for its remote bindings, and the failed remote session took the whole
# group down with an esbuild `all goroutines are asleep - deadlock!`. Name the configs instead.
cd packages/services/edge && pnpm exec tsx scripts/dev.mts \
  --config=wrangler.jsonc --config=../hub-service/wrangler.jsonc \
  --config=../identity-service/wrangler.jsonc --config=../db-service/wrangler.jsonc \
  --config=../kms-service/wrangler.jsonc --config=../registry-service/wrangler.jsonc \
  --config=../blob-service/wrangler.jsonc --config=../operation-service/wrangler.jsonc \
  --config=../compute-service/wrangler.jsonc --config=../jetstream-service/wrangler.jsonc \
  --config=../tail-logger/wrangler.jsonc

# 2. The test (in the dxos repo).
redis-server --port 6379 &
cd packages/e2e/blade-runner
GRAVITY_OUT_BASE=$PWD node --import tsx src/main.ts edgeStress --no-browser --seed <seed> [-s spec.yml]
```

Notes that cost time to find:

- `blade-runner:build` is a **no-op** (`command: 'true'`), so the `pnpm run-tests` entry
  (`dist/lib/node-esm/main.mjs`) does not exist. Run the TypeScript with
  `node --import tsx`; replicants inherit `execArgv`, so children load TS too.
- `main.ts` loads each plan and each replicant through a dynamic `import()`. A static barrel
  would load every plan's dependencies to run any one of them, and `edge-sync` transitively
  pulls the function bundler (`parsimmon`), which fails to load as ESM.
- Pass `--no-browser` for this plan: it is node-only, and the bundle step is pure overhead.
- Only EDGE gets an HTTP port in group mode; the other workers answer over service bindings.
- Detach the stack with `setsid`: started from a foreground shell it dies with its process group,
  and the symptom downstream is every replicant timing out at once.
- Both repos need ~15 min of setup and build before anything runs.

## 2. Reproducibility (the goal)

The full sequence is written to `command-trace.jsonl` as a `plan` entry **before the fleet is
spawned** — `makeFleetModel` is pure, so the plan is a function of the seed alone.

Every run below planned **25 of 25** commands, against 24 planned / 3–5 executed before the
generator was fixed.

| Run | Seed | Profile | Executed | Stopped by |
| --- | --- | --- | --- | --- |
| A | `run-a-2026-08-31` | full | 6 | replicant 0 crashed — finding 5 |
| B | `run-b-nopart` | `partitions: false` | 12 | `document not found: s0-d2` — modelling error, fixed |
| C | `run-b-nopart` | `partitions: false` | 5 | `peers disagree on space 0` at the first checkpoint — barrier too weak, fixed |
| D | `run-b-nopart` | `partitions: false` | 8 | `sync did not quiesce for space 1 within 60000ms` — finding 6 |
| E | `run-e-second-seed` | `partitions: false` | 8 | `Cannot modify ECHO object property "0"` — replicant bug, fixed |
| F | `run-e-second-seed` | `partitions: false` | **25** | final assertion: `differentDocuments: 1` after 21 data operations — finding 6 |
| G | `run-e-second-seed` | `partitions: false`, **linked stack** | **25** | identical failure to F — finding 6 is not version skew |

B, C and D share a seed and drew byte-identical `plan` lines across three intervening changes to
the executor — the generator depends on the seed and nothing else. The seed fixes the sequence,
not the timing: a run against a live service is not bit-reproducible, which is why the trace, not
the seed, is the artifact to debug from.

Run D's plan, for reference — 25 commands, 17 of them data operations:

```
CreateSpace(1) CreateSpace(1) CreateDocument(0,0) CreateDocument(1,0) Checkpoint()
EditText(1,0,1,0.5) CreateDocument(2,1) Checkpoint() CreateDocument(0,0) EditText(1,0,0,0.5)
EditText(1,1,0,0.75) EditText(2,0,2,0.5) CreateDocument(0,0) EditText(0,0,2,0.5)
CreateDocument(0,1) EditText(0,1,0,0) EditCounter(0,0,2) EditCounter(2,1,1) CreateDocument(1,1)
EditText(0,1,2,0.5) DeleteDocument(1,0,3) EditText(2,0,2,0) EditText(2,0,1,0.75)
EditCounter(0,1,1) EditText(0,0,1,0)
```

## 3. Corrections to the design

- **A drawn plan is not an executed plan.** `fc.commands` is state-blind and
  `fc.asyncModelRun` silently discards any command whose `check(model)` fails, so a sequence
  opening `JoinSpace(0,1) EditText(0,0,2) JoinSpace(0,0)` — before any space existed — reported
  25 planned and ran 3. Each command's model transition (`advance`) is now separated from its
  system half, so a sequence can be **simulated with no fleet**: `plan.ts` draws a pool, filters
  it against a throwaway `makeFleetModel`, and records and runs only the survivors. Execution is a
  plain loop under an `invariant`, so a model/simulation disagreement fails loudly instead of
  shortening the run.
- **Uniform draws test almost nothing.** `Restart` and `Checkpoint` are enabled from the first
  command while every data operation waits for a space and a document, so a uniform 25-command
  plan reached one edit. The vocabulary is weighted (`EditText` 8 … `DeleteDocument` 1) and
  candidates are ranked by data operations rather than length. Measured on the same seeds: 25/25
  executable, 9–16 of them data operations, against 3–5 executed and zero spaces before.
- **Membership is not possession.** The model treated an identity's membership as licence for any
  of its devices to act, but a device that was offline when its identity joined has never received
  the space. `ModelSpace` now tracks `knownBy` per device, a device catches up when it reconnects,
  and `execute` waits for sibling devices to actually receive a space — so a broken HALO promise
  fails at the command that made it.
- **A document is not instantly everywhere.** The plan issued an edit on peer B the moment peer A
  created the object; `#findDocument` now waits, bounded, and a timeout there is the real finding.
- **Convergence is a temporal property, so the assertion has to be a wait.** `quiesce` only proves
  each peer has nothing outstanding against EDGE; a document EDGE had not yet offered to a sibling
  left both sides reporting caught up while their digests differed, and run C failed its first
  checkpoint on a pair that agreed moments later. Checkpoints and the final assertion now retry
  within the quiescence budget — run D passed that same checkpoint and got three commands further,
  to a stall that does **not** resolve (finding 6).
- **The replicant wrote an ECHO property directly.** `editDocumentCounter` assigned
  `doc.counters[slot]`, which ECHO rejects outside `Obj.update`. Only the second seed reached an
  `EditCounter` at all, which is a fair illustration of what the generator fix bought: a bug latent
  through every previous run surfaced on the first plan that got there.
- **`fc.assert` cannot drive this.** With `numRuns: 1` it biases to the smallest input and drew
  **2 commands** against a `maxCommands` of 25 (measured). Superseded by the pool-and-simulate
  scheme above.
- **Offline is a transport cut, not `EdgeConnection.close()`.** DESIGN.md §15.1 predicted the
  `_networkingStarted` flag would block re-dialing. It does, but resetting it is not sufficient:
  the connection is built with `deferConnect: true` (`service-host.ts:447`), and after
  `close()` + `open()` + `startNetworking()` the status stays `NOT_CONNECTED` (measured), after
  which `client.destroy()` hangs 10s in `leaveSwarm`. Each replicant now runs a loopback TCP proxy
  in front of EDGE and cuts it — closer to "no network" anyway, and needs no SDK change. **The SDK
  defect stands and is unfixed**: an `EdgeClient` cannot be restarted once closed.
- **Operations are Effect schemas.** The vocabulary is one `Schema.TaggedUnion`; per-tag
  arbitraries come from `schema.cases`, so a draw weight can never name an operation that does not
  exist. Bounded indices are `Schema.Literals` rather than range-checked integers: generation needs
  no rejection, and repeated draws collide on the same slot, which is where concurrent-merge
  defects live.
- **fast-check now comes from `effect/testing`.** `effect` is already a declared dependency, so the
  undeclared direct `fast-check` import is gone; the version in use moved from 3.23.2 (resolved
  only via root hoisting) to the 4.9.0 that Effect pins.
- **Space sharing must be delegated, not interactive** — finding 3.

## 4. Findings

1. ~~**A sibling device never receives its identity's space.**~~ Not reproduced since the storage
   fix (§5) and the delegated-invitation change. Runs B and C wait explicitly for every sibling
   device to receive each space (`settleLearned`) and cleared it at every `CreateSpace`.
2. **`client.destroy()` throws when EDGE is unreachable.** Teardown leaves its swarms over EDGE
   (`SpaceProtocol.stop` -> `leaveSwarm` -> `EdgeSignalManager.leave` -> `EdgeClient.send`) and
   fails with `Edge connection closed` when the link is down. Worked around by restoring the link
   before restart, so "restart while offline" is not covered.
3. ~~**A space invitation can time out after the guest restarts.**~~ Cause found: the harness was
   sharing **interactive** invitations, which per `invitation.proto` "require both to be online to
   complete key exchange". `shareSpace` now opens a `Type.DELEGATED` invitation, whose credential
   is written to the space's control feed and whose redemption goes through EDGE
   (`EdgeInvitationHandler`). Verified: fleets of 3 clients across 2 identities now pair and join
   in ~17–21 s, and runs get past the join every time.
4. **`EdgeClient` is not restartable** — §3 above.
5. **Cutting the EDGE link crashes the peer process.** `EdgeFeedReplicator` subscribes to the
   feed's `append` event with an async listener
   (`edge-feed-replicator.ts:143`); `Event.emit` calls listeners and discards the returned promise,
   so when `_pushBlocksIfNeeded` -> `EdgeClient.send` rejects — which it does 10 s after the link
   goes down — the rejection is unhandled and Node exits. Every run that writes while offline dies
   this way. Two candidate fixes, neither taken here because both change SDK behaviour outside this
   PR's scope:
   - route the listener's rejection into the connection `Context`, which already resets on
     `EdgeConnectionClosedError`; and/or
   - have `EdgeClient.send` throw `EdgeConnectionClosedError` rather than a bare `TimeoutError`
     when the ready trigger times out — the connection is, in fact, not open, and every caller
     already handles that error.
   The `partitions: false` spec (`configs/edge-stress-no-partitions.yml`) exists to exercise
   convergence while this stands.
6. **A document stops halfway: discovered but never delivered.** Run D, second checkpoint, space 1
   (created by client 2, one document created in it):

   ```
   sync did not quiesce for space 1 within 60000ms:
     client 0 {"connected":true,"missingOnLocal":1,"missingOnRemote":0,"differentDocuments":0,"localDocumentCount":1}
     client 1 {"connected":true,"missingOnLocal":1,"missingOnRemote":0,"differentDocuments":0,"localDocumentCount":1}
   ```

   Both devices of the other identity stay connected for the full 60 s, know a document is missing,
   and never receive it. The SDK says the same thing from the inside, against both the peer host
   and the subduction replicator:

   ```
   AutomergeHost#0 collection sync not converging {
     collectionId: 'space:BDRDYYOUL2PYVT4PU5AKD36OS4LTRSXEV:4CiyCJh1NvL1yCR1pzqe7Tug4F6R',
     passes: 6, missingOnLocal: [ '47jBHyTpJRZbQWgM4b7TABe484Wj' ], missingOnRemote: [], different: []
   }
   ```

   Run F, which executed the whole sequence, reaches the same wall from the other side — after 21
   data operations the final assertion finds one document whose *content* differs and stays
   different:

   ```
   sync did not quiesce for space 0 within 60000ms:
     client 0 {"connected":true,"missingOnLocal":0,"missingOnRemote":0,"differentDocuments":1,"localDocumentCount":5}
     client 1 {"connected":true,"missingOnLocal":0,"missingOnRemote":0,"differentDocuments":1,"localDocumentCount":5}
   ```

   Both devices of identity 0 disagree with EDGE on the same document; identity 1's device had
   quiesced. Nothing is missing in either direction — this is a merge that never reconciles, not a
   transfer that never starts.

   Repeating that run against a **linked** stack (run G, §6) reproduced it exactly — same seed,
   same plan, same failure, same counts — so it is not version skew. On the linked run the SDK
   names the state outright, once per peer:

   ```
   AutomergeHost#0 diverged document has no subduction retry path {
     collectionId: 'space:BPHSYTOHOZWN4DZ2TYRFT7R5ZQRUD3BWM:2fnoNshSGe5fBLb88rgqXHQXU1Cf',
     peerId: 'subduction-replicator:BPHSYTOHOZWN4DZ2TYRFT7R5ZQRUD3BWM-0b89e5f1-…',
     documentId: '2TeamFZEx3bdeDagdCjWkpGhSMM2',
     sedimentreeId: '68c1e9f52eb94567b5a896576c3e6689…'
   }
   ```

   "No retry path" is the point: this is terminal, not slow. Both sides know the document differs
   and neither has a mechanism to reconcile it, which is why waiting does not help.

   Nor is it a deleted document being counted as different — the plan for this seed puts both
   `DeleteDocument`s in space 1, and the failure is in space 0, which has four documents and no
   deletions.

   So discovery works and **content transfer does not** — which rules out the collection-membership
   hypothesis the wire logs first suggested. Worth checking against, but not obviously the cause:
   the edge db-service's subduction decoder
   (`packages/services/db-service/src/worker/subduction/utils.ts:199`) handles
   `subduction-frame`, `subduction-batch`, `subduction-connection` and `collection-query`, and
   warns `unexpected inbound frame type` on the `collection-state` the client sends
   (`echo-network-adapter.ts:198`). `collection-state` predates the catalog pin, so this is not
   version skew.
7. **`POST /db/spaces/:id/notarization` 500s on the local stack** while `GET` on the same path
   succeeds. Seen on every run; the delegated join still completes, so it is not blocking. Not
   filed — needs a look at the local stack's own logs first.

## 4b. Against deployed dev EDGE (dev.dxos.network)

`edge dev` was redeployed (all 12 workers), and a minimal probe — one identity, one device, one
space, `configs/edge-stress-dev-probe.yml` — was run against it. Two things came out of it, both
fixed or characterised; the probe itself failed and its space and identity are still there
(`BLHSBW7YTLRFZZVFWT4M4MRVX5OO2XJHB`, `did:halo:BDFMLFLXMZ5NOCYIF3VLBN6KYPG5XXEPC`), pending a key.

1. **The offline proxy cannot front an `https:` endpoint.** Every replicant routed EDGE through a
   loopback TCP pipe so `goOffline` can cut it. Against `https://dev.dxos.network` the client
   offered a TLS handshake to a plain socket and sent `Host: localhost`, so the websocket flapped
   on code 1006 and `getSyncState` reported `connected: false` forever. The port default was 80
   regardless of scheme, too. The proxy now exists only when `partitions` is on, and asserts a
   plain-http endpoint; a run without partitions dials EDGE directly.
2. **Self-serve cleanup 403s for an identity EDGE has not bound to a Hub account.** The
   data-management API has exactly the endpoint a run wants — `DELETE /data/space/:id` and
   `DELETE /data/identity/:did`, authenticated by a verifiable presentation the identity signs, no
   shared secret. The replicant now mints that presentation itself
   (`createEdgeIdentity` + `authenticateViaChallengeEndpoint` + `encodeAuthHeader`, all public) and
   deletes its own data. Measured against dev: **403 on both**, which matches the middleware's
   documented gate — `edgeAuth({ lookupAccount: accountLookupViaHubService() })` rejects an
   identity with no Account, and `halo.createIdentity` creates one. So a run against a deployed
   environment needs `DX_HUB_API_KEY` after all; cleanup falls back to it automatically
   (`Authorization: Bearer`, the canonical form — `X-Admin-Key` is legacy).

Setup against dev is fast: identity minted and space created in **4.9 s**, against 15–21 s for a
3-client fleet locally.

## 4c. Minimal reproduction — and a bug in the test, not the product

`spec.planFile` replays a recorded plan instead of drawing one: the plan trace entry now carries the
commands structurally as well as readably, and a replayed plan is simulated before execution so an
edited one reports which command cannot run. That turns a counterexample into a fixture, which a
sampled sequence otherwise lacks — there is no fast-check shrinker to lean on.

Hand-shrinking run F/G's 25-command plan to five
(`configs/plans/finding-6-candidate.json`, `configs/edge-stress-finding-6.yml`):

```
CreateSpace(2)  CreateDocument(2, 0)  EditText(0, 0, 0, 0.5)  EditText(1, 0, 0, 0.5)  EditCounter(0, 0, 0)
```

Four of five runs failed, always with the same corrupted text:

```
client 0 diverged from the model on space 0:
  model:  [["s0-d0",["c0-1","c1-2"],[1,0,0]]]
  client: [["s0-d0",["c0(c1-2)"],[1,0,0]]]
  raw:
    s0-d0: "(c0(c1-2)-1)"
```

**This was the test's fault, and it was briefly written up here as an Automerge interleaving
anomaly. It is not one.** `editDocumentText` inserts at `floor(positionRatio * content.length)`
computed from the client's *local* text. Once a peer has received the first client's six-character
token, a ratio of 0.5 resolves to index 3, which is inside it — and splicing the second token there
produces exactly the observed string, reproduced by arithmetic alone. The runs that passed are the
ones where the second client had not yet received the first's edit, so both inserted at index 0 and
the tokens landed adjacent.

The merge was correct every time. What was wrong was the model's assumption that a multi-character
token stays contiguous and recoverable by regex, which a mid-token insert makes false.

Fixed by making a token **one character** (BMP private use area, so one UTF-16 unit — outside the
BMP a splice could land between surrogate halves). A character cannot be split, so the set of
characters in the text is exactly the set of operations applied, whatever order they merged in, and
the digest reads `[...content]` with no parsing to get wrong.

Two lessons worth keeping:

- A model-based test's own encoding is part of the model. A delimited multi-character token quietly
  asserted "an insert never lands inside a token", which nothing guaranteed.
- The counters on the same document were correct in every failing run. That should have been the
  clue: a CRDT that interleaved text would not keep per-writer registers exact.

## 5. Harness gaps found

- `blade-runner:build` is a no-op, so the documented entry point does not exist.
- Replicant stdout/stderr went unread, so a replicant that died before its log processor flushed
  left no trace at all. `runNode` now pipes both to `replicant.out.log`; this is what made every
  diagnosis above possible.
- **A dead replicant hung the orchestrator forever.** RPC to a replicant is created with
  `timeout: 0`, so when replicant 0 crashed (finding 5) the orchestrator sat on a reply that would
  never come — no error, no timeout, no diagnosis. `ProcessHandle` now exposes `exited` and the
  scheduler aborts the RPC peer when a replicant dies, so the in-flight call rejects where the
  crash happened.
- `analyzeResourceUsage` throws `ENOENT` on `agent.log` for a plan whose replicants never wrote
  one. Caught and warned by `runPlanner`, so harmless, but noisy.
- The RPC codec silently corrupted two common types rather than rejecting them: `PublicKey` has a
  `toJSON` returning hex, so a key arrived as an indistinguishable string, and a `Uint8Array`
  arrived as `{"0":1,...}`. Now tagged and round-tripped (`redis/rpc-codec.ts`, nine tests).
- **Every local run used in-memory SQLite.** The replicant set `persistent: true` and a `dataRoot`,
  but `LocalClientServices` selects the backend from `runtime.client.storage.sqlite_mode`, which
  defaults to in-memory — it only logs `sqlite_mode not set, using in-memory SQLite` at warn level.
  So `Restart` destroyed a client and re-initialised an **empty** one: it never tested crash
  recovery, and a restarted client losing its data would fail convergence for the wrong reason.
  Fixed by setting `sqliteMode: FILE` plus an explicit `sqlitePath` — FILE reads the path from the
  `LocalClientServices` constructor, not from `data_root`, despite what its own error message says.
  Verified: `index.sqlite` now appears on disk where nothing did before.

## 6. Linking the stack (run G)

`pnpm link-packages ../dxos --all --install` in the edge repo replaces the `dxos` catalog with 327
`file:` packs built from this checkout, so client and workers run the same code. Notes:

- The install takes ~50 min in this container (326 `pnpm pack` invocations, then a full resolve).
- `operation-service` cannot be started afterwards: it imports seven `@dxos/plugin-*` subpaths
  (`@dxos/plugin-inbox/InboxPlugin` and friends) that the packs do not expose, and esbuild fails the
  whole group. Drop it from the config list — the stress test does not use it.
- Everything else starts clean, with zero unresolved imports.

**Result: run G reproduced run F exactly.** Same seed, same 25-command plan, all 25 executed, and
the same failure with the same numbers:

```
sync did not quiesce for space 0 within 60000ms:
  client 0 {"connected":true,"missingOnLocal":0,"missingOnRemote":0,"differentDocuments":1,"localDocumentCount":5}
  client 1 {"connected":true,"missingOnLocal":0,"missingOnRemote":0,"differentDocuments":1,"localDocumentCount":5}
```

So finding 6 stands on its own: it is a convergence defect, not a consequence of running a client
against older workers. The `subduction: unexpected inbound frame type { type: 'collection-state' }`
warning also persists with matched versions, confirming it is an edge-side gap in db-service's
frame decoder rather than skew.

**Cleanup worked here**: `{"event":"cleanup","spaces":2,"accepted":4,"refused":[]}` — the self-serve
path deleted both spaces and both identities with no admin key. The 403s in §4b are specific to the
deployed environment's Hub-account gate, not to the mechanism.
