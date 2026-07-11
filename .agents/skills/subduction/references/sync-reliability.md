# Subduction edge-sync reliability

Hard-won findings from a stress campaign (90+ instrumented runs, host→edge→guest against the
deployed Cloudflare worker, 100 → 5000 docs). Read this before touching subduction sync on either
side — client (`@dxos/echo-host` `echo-edge-subduction-replicator.ts`, the automerge-repo
`2.6.0-subduction.*` patch) or edge (`db-service` `subduction-automerge-replicator.ts`).

The single most important fact: **the 60 s per-round WASM timeout is the amplifier that turns every
transient fault into a multi-second-to-permanent stall.** Most of the machinery below exists to keep
faults from ever reaching that timeout.

## 1. The 60 s round timeout (`syncMs`, default in the automerge-repo patch)

A round is fire-and-wait: `subduction.syncWithAllPeers(id, subscribe, timeoutMs)` has no abort
handle, no delivery ack, no per-round re-ask, and no progress-based deadline. **Any** disruption
therefore costs the full 60 s. Observed triggers:

- a single lost frame (workerd cancels I/O from a dead invocation context — see §6);
- a connection removed while a same-peer sibling exists — `subduction_core` **strands** (does not
  fail/re-route) its pending requests (see §3);
- a peer silently gone (session evicted, requester never told);
- a round genuinely slower than 60 s (the O(N²) cliff, §2) → timeout → retry → timeout = livelock;
- a transport send failure misclassified as peer-disconnect.

Upstream asks (filed): progress-anchored deadlines / per-round re-ask, always-fail-on-removal, an
abort API, message-level acks. Until then, everything downstream is worked around.

## 2. O(N²) bulk sync — the cliff

Per-document ingest cost on the DO grows **linearly with the number of docs already in the space**
(prime suspect: each `add_batch` triggers an internal `syncWithAllPeers` that walks the peer's whole
sedimentree set). Measured at 3000 docs: DO pass time 973 ms → 9.4 s for constant tiny batches
(~10 ms → ~250 ms per frame); client round p50 6 s → 38 s; throughput 1024 → 84 rounds/min. Pushing
N docs is O(N²).

Combined with §1 this is a hard cliff: around **2500–4500 docs** round latency crosses 60 s, every
round times out, heal retries re-run the same over-budget work, and sync **freezes permanently**
(the heal budget of 10 attempts exhausts in ~6 min and, with a healthy WS, nothing re-drives).
1000 docs works only because it finishes before the cliff. Retroactively: 100 ≈ 10 s, 1000 ≈
35–75 s, 3000+ = wall. Mitigations at our layer: raise/adapt `syncMs`; coalesce more frames per WASM
ingest. Real fix is upstream (per-ingest work independent of collection size).

## 3. Connection replacement: **do not drain — close/evict immediately**

Verified by A/B (`dropConnection` probe, both sides): immediate close recovers a replaced connection
in **~0.3 s**; any drain/grace window recovers in **~66 s** — 200× worse. Why the drain is
self-defeating: its own justification ("`subduction_core` strands requests when the connection is
removed while a same-peer sibling exists") describes a condition **the drain itself creates** by
keeping the old connection alive as that sibling. Close before the successor binds and there is no
sibling → `subduction_core` fails the pending requests promptly → the generation re-drive (§4)
completes them on the fresh connection in ms.

So: client `_closeReplacedConnection` closes at once; edge `_evictSupersededSession` sends the
superseded error and disconnects in one step (a `superseded` flag drops frames racing the eviction).
No refuse/suppress/quiesce machinery — it was implemented, measured harmful, and deleted.

## 4. Admission control + heal re-drive (automerge-repo patch)

- **In-flight gate**: `#doSync` acquires a shared semaphore (`MAX_IN_FLIGHT_DOC_SYNCS = 100`); the
  heal scheduler's retries pass through the **same** gate (`syncGate` option) so a reconnect burst
  or a heal storm can't dispatch 800+ concurrent rounds (each starting a 60 s clock).
- **Re-drive on reconnect**: an `all-failed` entry is re-driven when the connection _generation_
  changes, with a fresh heal budget. Without this, a doc that exhausts heal on a dead connection is
  orphaned forever (a healthy WS never bumps the generation). Verified: after a drop, 100/100 rounds
  re-drove ~2.6 s post-settle and all succeeded.
- **`lastSyncGeneration` is stamped at round _start_, not enqueue** — a round queued behind the gate
  across a reconnect must count against the generation it actually runs under.

Why the gate is a patch and not `SubductionPolicy`: policy hooks can only allow/deny (a deny is a
_failure_ with heal-backoff, not queueing), fire mid-round after resources are committed, carry no
round identity or completion signal, and the recovery kick (`shareConfigChanged`) doesn't reach the
denied party on a push. Policy is the security seam; the dispatch layer is the flow-control seam.

## 5. Effect wiring: the edge replicator layer must sit **below** the core stack

`DataSpaceManagerLayer` (inside `coreLayers`) resolves the edge replicator via
`Effect.serviceOption(EdgeAutomergeReplicatorService)` — exactly like the sibling mesh replicator. It
resolves to a value **only if the providing layer is below it** in the `provideMerge` chain. The
edge replicator layer requires only `Edge{Connection,HttpClient}Service` (NOT `EchoHostService` —
that's the feed-syncer), so it belongs below core, next to `edgeInputLayer`. Placing it _above_ core
(the feed-syncer's position) compiles fine — `serviceOption` is optional — but resolves to `none` at
runtime, so `connectToSpace` silently never runs and **all edge document replication is dead** with
no error. This shipped broken on main once. Guard: `serviceOption`-resolved wiring must be validated
by an actual sync run, never by typecheck alone.

## 6. Workerd dead-context I/O → the alarm pump

Subrequests/timers spawned after their invocation returns are silently cancelled by workerd (the
promise never settles). This caused reply loss and permanently wedged pumps. The edge DO therefore:
runs all outbound work inside live **alarm** invocations sliced to ~5 s (`ALARM_PUMP_SLICE_MS`) so it
never monopolizes the isolate (which would starve router relays/pings and trip client keepalives);
races every `sendMessage` against a 10 s timeout (Workers RPC has none), treating timeouts as
transient; replaces the pass mutex with a 60 s pass **watchdog** so a never-settling send can't pin
all future alarms; and treats a **past-time `getAlarm()` as absent** (a stale alarm otherwise
suppresses re-arm forever). A past-invocation send that never settles is re-issued by the unacked
sweep; a settled _failure_ is final.

**workerd can also silently drop an armed alarm outright** (proven with instrumented bundles under
miniflare: enqueue-time `setAlarm` committed, the handler was never invoked, `getAlarm()` read null
afterwards — no error anywhere). A DO whose only wake-up source is the next inbound enqueue then
strands its queue until the client's 60 s round timeout happens to produce one. Mitigation: quiet
slices keep a **5 s heartbeat alarm** chained while inbound activity is recent (30 s window), so any
dropped alarm self-heals in seconds and idle DOs still quiesce.

**A one-pass-per-alarm pump does not survive load.** A simplification (dequeue 20 → feed WASM →
await recv-drain → await batched sends → return) passed every small-scale suite but the per-pass
alarm re-arm latency on deployed workerd (~0.2–0.9 s) is paid per page, so with ~100 rounds in
flight tail replies cross the 60 s round deadline. The slice pump (many back-to-back passes per
invocation) exists precisely to amortize that gap; keep it.

## 7. Keepalive watchdog must be starvation-aware (`edge-ws-connection.ts`)

The 12 s inactivity watchdog must **not** restart on wall-clock silence alone: bulk-sync CPU pins the
client event loop, so pings don't get sent and pongs sit unprocessed — self-inflicted silence, not a
dead server. Restart only when pings were actually flowing (recent send) **and** the timer fired on
schedule (loop was alive); otherwise probe and re-arm. Proven load-bearing: reverting it caused 2
false restarts → ~200 stranded rounds on 60 s timeouts → failed run.

## 8. Frame batching

Transport-layer coalescing (per-pass/per-connection on the edge, size+time-bounded on the client).
Cut the 1000-doc pull from ~66 s to ~17–21 s. Contract + bounds:
`db-service/.../subduction/frame-batching-spec.md`. Decoders always accept single and batched frames;
handshake is always single. Edge **emission is capability-inferred**: the DO coalesces replies only
to a connection that has itself sent a `subduction-batch` envelope (a batching client always ships
the decoder); everyone else gets plain single frames. This matters because clients on published
packages predate the decoder and **silently drop** batch envelopes — under the old timing they
mostly received singles by luck, and any change that makes multi-frame flushes more likely (e.g.
waiting for recv-drain before flushing) turns that into a deterministic stall.

## 9. Recovery semantics to remember

- `shareConfigChanged()` re-drives only `all-failed` / `no-peers` entries; it does **not** rescue a
  round still `syncInFlight` (that's the §1 timeout's job) and does **not** recover an
  `authorizePut` deny (needs a fresh holder commit — see the policy skill).
- A fetch for a doc the peer doesn't have yet settles as **success-empty** — nothing re-asks when it
  arrives later, so `loadDoc(fetchFromNetwork)` racing a not-yet-pushed doc hangs unboundedly. Tests
  must barrier on the push landing (`waitForEdgeSyncPeer`) before fetching.

## Reproduce / validate

`packages/services/edge/test/stress/edge-subduction-sync.test.ts`, gated by
`DX_TEST_TAGS=sync-stress`. Point at a deployment with `EDGE_URL`; scale with `DOC_COUNT`; give
`SYNC_TIMEOUT` room for a heal cycle (≥180 s at ≥1000 docs). The edge worker is bundled from
`out/main.js` — rebuild (`pnpm -s bundle`) after worker edits or you test stale code. Any
`serviceOption`/layer-wiring change **must** be validated with a real run, not typecheck (see §5).

**A stress verdict against the deployed dev edge needs a same-session baseline control.** The dev
environment itself degrades (observed: a full day where every build — including the previous day's
green artifact redeployed byte-identical — froze mid-push with ~85 s server-silence watchdog
restarts, while SigNoz ingestion was simultaneously dead). Before attributing a stress failure to
your change, redeploy the last known-green artifact and re-run; if it fails too, the verdict is
contaminated. Also: the worker bundle must be built under **committed** deps (a bundle produced
under `link-packages` node_modules is broken) — bundle first, then link for the client side.

## Upstream issues (Linear, `Automerge` label)

DX-1092 (60 s timeouts), DX-1093 (O(N²)), DX-1094 (14 msgs/doc coalescing), DX-1095 (no round abort),
DX-1096 (flow-control extension point vs policy), DX-1097 (heads divergence), DX-1098 (storage
migration), DX-723 (WASM unwinding).
