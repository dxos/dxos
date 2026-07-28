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

## Now

- [ ] **Land #12366.** CI green (build, check, test, workerd, storybook, changeset). Then edge bumps
      its `@dxos/*` catalog pin to pick it up.

## Next

- [ ] **Cap `BufferingTracingBackend.#pending`.** The only remaining unbounded container in
      `@dxos/tracing`: emptied solely by `drain()` (needs a real backend) or `clear()`, and edge
      installs no backend, so every dxos span there is allocated, retained forever and never
      exported. ~2 spans per database open. A ring buffer fixes it for every backend-less host with
      no flag and no behavioural change — one file. See DESIGN.md for why this beats a kill switch.
- [ ] **Decide on a diagnostics kill switch for edge** (optional, hygiene only). Evaluated in
      DESIGN.md. Key points: it would **not** have prevented DX-1140, since `QUERIES.add` and
      `OBJECT_DIAGNOSTICS.set` are unconditional writes; nothing is readable on a Worker anyway
      (`DiagnosticsChannel` needs `BroadcastChannel`); and
      `TRACE_PROCESSOR.tracingBackend = undefined` does **not** disable tracing — the setter falls
      back to the buffering backend, so there is no existing off state.
- [ ] **Call `unregister()` on instance-scoped diagnostics.** `echo-host.ts` (`echo-stats`,
      `database-roots`, `database-root-metrics`) and `query-service.ts` (`active-queries`,
      `query-invalidation`) register in their constructors and never unregister; the closures capture
      `this`. Bounded (fixed ids overwrite) so it pins only the most recent instance — a constant,
      not a leak — but it is untidy and it makes real leaks harder to spot.

## Traps (paid for already)

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
