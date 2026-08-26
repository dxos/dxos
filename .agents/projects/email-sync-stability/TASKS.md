# Email sync stability (dxos side) — tasks

The dxos half of a cross-repo work-stream; the edge half has its own TASKS.md in `dxos/edge` under the
same project name. Tracking: [DX-1076](https://linear.app/dxos/issue/DX-1076) (parent),
[DX-1140](https://linear.app/dxos/issue/DX-1140).

## Done

- [x] **Find the per-invocation retention** — it is the `client-queries` diagnostic, not a document
      cache. Module-level `QUERIES` set, never pruned, holding a `StackTrace` whose unformatted
      `Error` retains each captured frame's receiver — so the `new QueryResultImpl(...)` frame pinned
      the query and the whole client graph behind it.
- [x] **Fix it** (PR #12366): `QUERIES` holds weak refs pruned by a `FinalizationRegistry`;
      `OBJECT_DIAGNOSTICS` stores the formatted string and is capped with oldest-first eviction;
      `StackTrace` formats once and releases the `Error`.
- [x] **Verify against the edge harness** — unpatched died at dispatch #428/450 (2.37× growth, V8
      fatal); with the fix 450/450, zero failures, flat at 895 ms. Negative control: restoring a
      strong ref behind the `WeakRef` turns the new unit test into a timeout.
- [x] **Land #12366** — merged 2026-07-28 by mykola-vrmchk. Edge picks it up on its next
      `@dxos/*` catalog bump.
- [x] **Fix `clear()`-after-throwing-emit in the proxy event batching.** Both sites now drain
      before emitting and aggregate errors, via three shared helpers in
      `echo/src/internal/common/proxy/event-batch.ts` — `emitEventTarget` (emit one target,
      collecting a throw), `drainEventTargets` (clear the queue, then emit), `rethrowEmitErrors`
      (rethrow one as-is, aggregate several). `batchEvents` and `executeChange` both use them, so
      a throwing emission can no longer strand a target in either module-level queue. 10 tests in
      `event-batch.test.ts`; negative control run (pre-fix ordering shimmed back in) fails 8 of
      the 10. **Correction to the premise below: not reachable today** — see Traps.
- [x] **Bound `SPACE_IDS_CACHE`** (`echo-protocol/src/space-id.ts`) — `MAX_SPACE_IDS = 1_000`,
      oldest-first, mirroring `MAX_OBJECT_DIAGNOSTICS` from #12366. No test: `echo-protocol` has
      no `ts-test` tag, so the package has no test runner, and eviction has no observable effect
      from outside (a miss just recomputes the same SHA-256).
- [x] **Cap `BufferingTracingBackend.#pending`** — a ring buffer over `MAX_BUFFERED_SPANS = 1_000`
      with a `dropped` counter, so a backend-less host stops retaining every span it ever started.
      One behavioural correction came with it: `drain()` used to forward an untranslatable
      `buffered-*` parent traceparent to the real backend, which cannot parse it; an orphan (now
      reachable through eviction, previously only when a replay returned no context) is re-rooted
      instead. 5 tests in `tracing.test.ts`.
- [x] **Call `unregister()` on instance-scoped diagnostics.** Registration moved out of the
      constructors into `_open`, unregistered in `_close`, for both `echo-host.ts` (`echo-stats`,
      `database-roots`, `database-root-metrics`) and `query-service.ts` (`active-queries`,
      `query-invalidation`). Registering in the constructor and unregistering in `_close` would
      have left a reopened host without diagnostics — `Resource.open()` after `close()` is
      supported. `DiagnosticsManager`'s identity guard (`registry.get(id) === impl`) makes the
      overlap safe when two instances share an id.

## Now

- [ ] **Land the bounded-containers change** (this branch: `claude/continue-project-xvcmxx`) —
      one changeset, `@dxos/echo` patch. Suites run green: echo 587, echo-host 299,
      echo-client 534, tracing 23.

## Next

- [ ] **Decide on a diagnostics kill switch for edge** (optional, hygiene only).
      **RECOMMENDATION: don't** — awaiting the user's call, so the box stays open. Evaluated in
      DESIGN.md. Key points: it would **not** have prevented DX-1140, since `QUERIES.add` and
      `OBJECT_DIAGNOSTICS.set` are unconditional writes; nothing is readable on a Worker anyway
      (`DiagnosticsChannel` needs `BroadcastChannel`); and
      `TRACE_PROCESSOR.tracingBackend = undefined` does **not** disable tracing — the setter falls
      back to the buffering backend, so there is no existing off state. With the buffering backend
      now bounded and the diagnostics caches capped, the cost a switch would have removed is gone.
- [ ] **Delete or wire `emitEvent`/`pendingEventTargets`** (`event-batch.ts`). `emitEvent` has no
      callers anywhere in the repo, and it is the only writer to `pendingEventTargets` — so that
      queue is never populated, and `eventBatchDepth` has no reader besides `emitEvent` itself.
      `batchEvents` is therefore a bare pass-through at ~10 call sites across 6 packages; the real
      coalescing all happens through `change-context`'s `queueNotification` /
      `queueOwnerNotification`. Either wire `emitEvent` up or retire `batchEvents` and its call
      sites — but that is a refactor across `echo`, `echo-client` and `plugin-review`, not a
      hygiene fix, so it wants its own change.

## Traps (paid for already)

- **`@dxos/async`'s `Event.emit` never propagates a listener error.** `EventListener.trigger`
  catches it and calls `ctx.raise`, which routes to `#onError` or converts to an unhandled
  rejection — it never rethrows synchronously. `emit`'s own JSDoc ("A thrown exception in the
  listener will stop the event from being emitted to the rest of the listeners") describes only the
  `DO_NOT_ERROR_ON_ASYNC_CALLBACK` path, and that flag is hardcoded `true`. So the
  clear-after-throwing-emit defect was **latent, not live**: the drain fix is hardening against any
  future emitter, and its tests use a stub emitter that throws rather than a real `Event`. Do not
  reason about listener-error propagation from that comment.
- **An unformatted `Error` retains the receiver of every frame it captured**; reading `.stack`
  releases them. Measured standalone: 7 MB retained and the capture site uncollected, versus back to
  baseline after formatting. Any long-lived record holding a `StackTrace` therefore retains its whole
  capture-site graph — grep `new StackTrace()` and check the lifetime of whatever holds the result.
- **Keep a `StackTrace` capture in the constructor body, not a field initializer.** An initializer
  adds its own frame and silently shifts every caller's `skipFrames` offset (`Context` reads a frame
  by index). A test now pins the offset; it caught exactly this regression.
- **A leak test is worthless until you have watched it fail.** Restore a strong reference behind the
  weak one and confirm the test times out before trusting a green run.
- **`query-result-cache.test.ts` already asserted query results are collectable and passed** —
  because `registry.query()` builds `RegistryQueryResult`, which never touches `QUERIES`. The
  `QueryResultImpl` path the database actually uses had no coverage. Check _which_ class a test
  exercises before reading it as proof.
