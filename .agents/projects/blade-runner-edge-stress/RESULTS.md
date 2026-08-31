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
- **Not yet green end to end.** Every stop so far has been a specific, reproducible cause — three
  of them modelling errors that are now fixed, two of them defects outside the test (§4).
- **Results are attributable to the client, not to this EDGE build.** The local workers resolve
  `@dxos/*` from a catalog pinned to `2be9f24c` (2026-08-27), 54 commits behind this branch, and
  the pin predates changes in `core/echo`, `core/mesh` and `sdk/client-services`. See §6.

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

Same seed, same plan, across two runs and across an intervening change to the executor:

| Run | Seed | Planned | Executed | Outcome |
| --- | --- | --- | --- | --- |
| A | `run-a-2026-08-31` | 25 | 6 | replicant 0 crashed (finding 5) |
| B | `run-b-nopart` | 25 | 12 | `document not found: s0-d2` (now fixed, §3) |
| C | `run-b-nopart` | 25 | _see below_ | rerun of B after the fix — identical plan |

B and C drew byte-identical `plan` lines. The seed fixes the sequence, not the timing — a run
against a live service is not bit-reproducible, which is why the trace, not the seed, is the
artifact to debug from.

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
6. **`POST /db/spaces/:id/notarization` 500s on the local stack** while `GET` on the same path
   succeeds, alongside `db-service:SubductionAutomergeReplicator: subduction: unexpected inbound
   frame type { type: 'collection-state' }`. Consistent with the version skew in §6 rather than a
   defect in either side; needs re-testing against a linked stack before it is filed.

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

## 6. What these runs do and do not prove

The EDGE workers resolve `@dxos/*` from the edge repo's `dxos` catalog, pinned to
`2be9f24c` (2026-08-27) — 54 commits behind this branch, and the range touches `core/echo`,
`core/mesh` and `sdk/client-services`. So:

- **Attributable to this checkout:** everything on the client side — the generator, the model, the
  replicant, and findings 2, 4 and 5, all of which are client-process failures with client stack
  traces.
- **Not attributable:** anything that looks like a wire-protocol or server-side disagreement,
  including finding 6. Link the stack first (`pnpm link-packages ../dxos --all --install` in the
  edge repo) before filing those.

The local stack is also not durable: wrangler died mid-run once, with an empty `✘ [ERROR]`, taking
every worker with it. A run that stalls with every replicant timing out at once should be checked
against `curl localhost:8787` before it is read as a product defect.
