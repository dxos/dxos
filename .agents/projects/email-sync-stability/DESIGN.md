# Email sync stability (dxos side) — design notes

The dxos half of a cross-repo work-stream; the edge half lives in `dxos/edge` under the same project
name. Tracking issue: [DX-1140](https://linear.app/dxos/issue/DX-1140), sub-issue of DX-1076.

## Shipped: the retention fix (PR #12366)

A Cloudflare Worker running ECHO operations on a cron trigger OOMed after ~390 invocations, with V8
reporting `Ineffective mark-compacts near heap limit` — GC ran and could not reclaim, so the memory
was reachable.

Cause: `echo-client/src/query/query-result.ts` holds a module-level `QUERIES` set that nothing ever
prunes. Its records carry a `StackTrace`, which keeps an **unformatted** `Error`. V8 retains a
captured stack structurally, with a strong reference to each frame's receiver, until
`Error.prototype.stack` is read — so the frame for `new QueryResultImpl(...)` retained the query, its
query context, the hypergraph, the client, the database and every document loaded through them. One
whole client graph per query, for the lifetime of the process.

Verified end-to-end against edge's 450-dispatch harness, same machine, only the resolved
`@dxos/echo-client` differing: unpatched died at dispatch #428/450 (22 failures, 1104 → 2620 ms =
2.37×, one V8 fatal); with the fix 450/450, zero failures, 895 → 895 ms (**1.00×**, flat), no fatal.

Fix in three parts: `QUERIES` holds weak refs pruned by a `FinalizationRegistry`;
`OBJECT_DIAGNOSTICS` stores the formatted string and is capped with oldest-first eviction;
`StackTrace` formats once and releases the `Error`.

## Open question: should edge disable dxos diagnostics wholesale?

Raised after the fix landed — if diagnostics cost memory and nothing reads them on a Worker, why run
them at all? Evaluated below; **not yet acted on**. Short answer: the idea is sound but it is
hygiene, not a fix, and there is a cheaper first move.

### What `@dxos/tracing` actually consists of

`trace` exposes exactly `addLink`, `diagnostic`, `mark`, `span`, `spanStart`, `spanEnd`, `metrics`.
(There is no `@trace.resource` or `@trace.info` in the current tree.) Everything hangs off one
`globalThis` singleton, `TRACE_PROCESSOR`, with four surfaces:

| surface               | container                                            | bounded?                                     | retains what                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trace.diagnostic`    | `DiagnosticsManager.registry`: `Map<string, …>`      | **yes** — fixed string ids, `set` overwrites | the `fetch` closure, so the _most recent_ instance per id (`EchoHost`, `QueryServiceImpl`). Constant `+1`, not linear. `unregister()` exists but echo-host and query-service never call it                                                      |
| `@trace.span`         | `BufferingTracingBackend.#pending`: `BufferedSpan[]` | **no**                                       | only strings/numbers — `StartSpanOptions` is `{name, op, attributes, parentContext, startTime}` and carries **no `this`**. But `BufferedSpan.#error` stores the raw error from `setError`, so a failing span retains a full `Error` with frames |
| `trace.spanStart/End` | `manualSpans`, `manualSpanTimestamps`                | **yes**                                      | paired `delete` in `spanEnd`; the one echo caller (`collection-synchronizer`) pairs correctly                                                                                                                                                   |
| `trace.metrics`       | `RemoteMetrics._metrics`: `Set<processor>`           | **yes**                                      | edge registers no processor, so every call is a no-op that allocates one throwaway array                                                                                                                                                        |

### The finding that matters most

**A "disable diagnostics" flag would not have prevented DX-1140.** `QUERIES.add(...)` and
`OBJECT_DIAGNOSTICS.set(...)` are unconditional writes in the `QueryResultImpl` constructor and the
`Hypergraph._resolveSync` path — they are not gated on diagnostics being registered or enabled. Any
kill switch that only skips `trace.diagnostic()` registration leaves both containers filling exactly
as before. The leak had to be fixed at the write sites, which is what #12366 does.

Worth stating plainly because the intuition "diagnostics leaked, so turn diagnostics off" points at
the registration API, and the registration API was never the problem.

### What disabling _would_ actually buy

One real thing: **buffered spans stop accumulating.** `#pending` is emptied only by `drain()` (when a
real backend is installed) or `clear()`. The only real backends are installed by
`@dxos/observability` (`extensions/otel/traces.ts`, `traces-browser.ts`) and blade-runner. **Edge uses
none of them** — its OTEL is `@dxos/otel-cf-workers` via `edge-platform`, entirely independent of
`TRACE_PROCESSOR`. So in an edge worker every dxos span is allocated, pushed, retained forever, and
never exported. Pure waste.

Volume is modest: ~2 spans per database open (`entity-manager.ts:224` `openWithSpaceState` and
`:1186` `_loadSpaceRootDocHandle`; `:1669` opts out via `showInRemoteTracing: false`). At 450
invocations that is ~900 spans of a few hundred bytes each — a fraction of a megabyte, against the
~290 MB the query leak produced. It is unbounded rather than large: a worker surviving 100k
invocations would hold ~200k spans.

Also worth noting: nothing is _readable_ in edge regardless. `DiagnosticsChannel.serve` is gated on
`BroadcastChannel != null`, which Workers do not provide, so no diagnostic can ever be fetched there.
Disabling loses zero functionality on edge.

### Cheaper first move: cap `#pending`

A ring buffer in `BufferingTracingBackend` removes the only unbounded growth for **every** host with
no backend installed, needs no flag, no env plumbing, and no behavioural change — spans are still
created and still propagate trace context; only the retained tail is bounded. Blast radius is one
file. This is probably the right first step, and it may be the only step needed.

### If a kill switch is still wanted

Two things to know before writing one:

1. **`TRACE_PROCESSOR.tracingBackend = undefined` does not disable tracing.** The setter treats
   falsy/self as "go back to buffering": it calls `clear()` and reinstalls `#bufferingBackend`. So
   there is no existing off state — disabling needs either a null-backend implementation or a flag
   checked inside `api.ts`.
2. **Prefer one gate inside `api.ts`** over touching call sites. `span`, `diagnostic`,
   `spanStart`/`spanEnd` and `metrics` all funnel through it, so ~4 functions cover 60-plus
   `@trace.span` sites and ~15 `trace.diagnostic` sites with no consumer churn.

Risks to check first:

- **Trace-context propagation.** `@trace.span` writes `TRACE_SPAN_ATTRIBUTE` onto the derived
  `Context` from `remoteSpan.spanContext`. Today that is a `buffered-N` string, and children read it
  for parenting. If spans stop being created the attribute disappears. The type docs describe these
  as plain strings used only for parenting, so nothing should break — but confirm no code treats the
  attribute's presence as meaningful before flipping it.
- **Default must stay on.** Browser devtools and blade-runner depend on both diagnostics and spans;
  the switch has to be opt-out and off only where edge sets it.
- **Errors, not spans, are the sharp edge.** `BufferedSpan.#error` keeps a raw `Error`. Any bound or
  gate should make sure the error path is covered, not just the happy path.

### Verdict

Do the `#pending` cap; treat a full kill switch as optional follow-up justified by CPU/allocation
hygiene rather than by DX-1140. Neither is on the critical path — the harness already passes 450/450
with #12366 alone.
