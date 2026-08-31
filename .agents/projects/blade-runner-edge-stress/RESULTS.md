# blade-runner-edge-stress — Phase 1/2 results (local EDGE)

What was actually executed, on 2026-08-27, in the Claude Code cloud sandbox against a locally
built EDGE stack. Design: [DESIGN.md](./DESIGN.md); ledger: [TASKS.md](./TASKS.md).

## Status

- **Reaches local EDGE.** Orchestrator + 2–3 replicant processes, each a real `@dxos/client`,
  authenticate to a local EDGE worker stack, create identities, pair devices, and execute a
  seeded command sequence. Read the next bullet before treating that as "working": of 16 local
  runs, 13 died before writing `test.json`, and the three that finished executed 0, 3 and 5
  commands and created **zero spaces**.
- **Reproducibility is proven** (§2) — the point of the exercise; the recorded hashes predate
  the generator change in §3 and need re-measuring, but the property itself is verified.
- **Not yet green.** The final convergence assertion has not passed: the run stops on real
  findings, listed in §4. Each is a specific, reproducible defect rather than flakiness.

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

# Start the group. ai-service needs CLOUDFLARE_API_TOKEN for its remote bindings and takes the
# whole group down without one, so leave it out; hub-service must be IN (edge auth needs it).
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
- Both repos need ~15 min of setup and build before anything runs.

## 2. Reproducibility (the goal)

The full drawn sequence is written to `command-trace.jsonl` as a `plan` entry before execution, so
a seed's sequence is provable regardless of how far the run gets.

| Run | Seed | Planned | Executed | Plan sha256 (16) |
| --- | --- | --- | --- | --- |
| A | `pbt-seed-alpha` | 24 | 3 | `e5bb5c0b5ee82e56` |
| B | `pbt-seed-alpha` | 24 | 3 | `e5bb5c0b5ee82e56` |
| C | `different-seed-zeta` | 24 | 5 | `e559958fd52cb246` |

Recomputed from the surviving run directories. **Planned is not executed**: `fc.asyncModelRun`
discards a command whose `check(model)` fails, and a drawn sequence opens with `JoinSpace` and
`EditText` before any space exists, so most of it is skipped. `maxCommands` bounds what is drawn,
never what runs — an earlier version of this table showed only the planned count, which read as
though 24 operations had been exercised.

A and B produced identical plans and identical executed traces. Same seed, same operations order;
different seed, different order.

The seed fixes the sequence, not the timing — a run against a live service is not bit-reproducible,
which is why the trace, not the seed alone, is the artifact to debug from.

**These hashes predate the generator change noted in §3.** Operations are now drawn from an Effect
schema through fast-check 4 rather than hand-built fast-check 3 arbitraries, so a given seed maps
to a different sequence. The property still holds — same seed, same sequence; different seed,
different sequence, verified directly against the new generator — but the table's values must be
re-measured on the next run against EDGE.

## 3. Corrections to the design

- **`fc.assert` cannot drive this.** With `numRuns: 1` it biases to the smallest input and drew
  **2 commands** against a `maxCommands` of 25 (measured), so nothing was exercised. The plan now
  draws `sampleDraws` sequences with `FastCheck.sample` seeded from `--seed` and executes the longest.
  This also removes the need for the one-fleet-per-run guard.
- **Offline is a transport cut, not `EdgeConnection.close()`.** DESIGN.md §15.1 predicted the
  `_networkingStarted` flag would block re-dialing. It does, but resetting it is not sufficient:
  the connection is built with `deferConnect: true` (`service-host.ts:447`), and after
  `close()` + `open()` + `startNetworking()` the status stays `NOT_CONNECTED` (measured), after
  which `client.destroy()` hangs 10s in `leaveSwarm`. Each replicant now runs a loopback TCP proxy
  in front of EDGE and cuts it — closer to "no network" anyway, and needs no SDK change. **The SDK
  defect stands and is unfixed**: an `EdgeClient` cannot be restarted once closed.
- **Operations are Effect schemas.** The vocabulary is one `Schema.TaggedUnion`, and the generator
  is `Schema.toArbitrary(...)(FastCheck)` — so a single declaration defines what may be generated,
  what a trace line contains, and what a trace line decodes back into. Bounded indices are
  `Schema.Literals` rather than range-checked integers: generation needs no rejection, and repeated
  draws collide on the same slot, which is where concurrent-merge defects live. The interpreter
  (`canRun` / `execute`) replaced nine command classes.
- **fast-check now comes from `effect/testing`.** `effect` is already a declared dependency, so the
  undeclared direct `fast-check` import is gone; the version in use moved from 3.23.2 (resolved
  only via root hoisting) to the 4.9.0 that Effect pins.
- **Space sharing must be delegated, not interactive.** See finding 3.

## 4. Findings (open)

1. **A sibling device never receives its identity's space.** Client 0 joins space 0 by invitation;
   client 1, a second device of the same identity, never sees it — 60s, both online, on the final
   assertion. Either HALO space-list replication between devices does not work in this
   configuration, or it needs something the harness is not doing. Re-test after the storage fix in
   §5: the run that produced this was using in-memory SQLite.
2. **`client.destroy()` throws when EDGE is unreachable.** Teardown leaves its swarms over EDGE
   (`SpaceProtocol.stop` -> `leaveSwarm` -> `EdgeSignalManager.leave` -> `EdgeClient.send`) and
   fails with `Edge connection closed` when the link is down. Worked around by restoring the link
   before restart, so "restart while offline" is not covered.
3. ~~**A space invitation can time out after the guest restarts.**~~ Cause found: the harness was
   sharing **interactive** invitations, which per `invitation.proto` "require both to be online to
   complete key exchange" — so a guest that had just restarted, or a host not swarming at that
   moment, waited out the full 60s. `shareSpace` now opens a `Type.DELEGATED` invitation, whose
   credential is written to the space's control feed and whose redemption goes through EDGE
   (`EdgeInvitationHandler`), so any member can admit the guest. **Not yet verified against a live
   run** — it typechecks and the module loads, but EDGE was unavailable in the session that made
   the change.
4. **`EdgeClient` is not restartable** — §3 above.

## 5. Harness gaps found

- `blade-runner:build` is a no-op, so the documented entry point does not exist.
- Replicant stdout/stderr went unread, so a replicant that died before its log processor flushed
  left no trace at all. `runNode` now pipes both to `replicant.out.log`; this is what made every
  diagnosis above possible.
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
