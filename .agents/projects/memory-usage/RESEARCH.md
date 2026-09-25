# Web-app memory usage — external research

Compiled 2026-08-06 from three research passes (industry norms, engineering
postmortems, strategy playbook). Sources linked inline. Passes 1 (norms) and 3
(strategies) land below as their agents complete.

## Pass 1 — industry norms & Chrome's warning

### Typical footprints of major web apps (published/observed)

- Bare Chrome tab: 30–50 MB. Gmail: ~150–250 MB active. Google Docs: 120–320 MB
  idle. Figma: 300–500 MB typical (2 GB per-tab cap; multi-GB with big files).
  Notion/Slack desktop: 300–700 MB, multi-GB loaded. Complex production
  React/Redux SPA (Kustomer case study): p50 ~120 MB post-optimization,
  p75–p90 300–500 MB, p99 >1 GB; their internal target: p90 ≤ 410 MB.
- Trend: average SPA memory grew ~6.6× from 2013 (45 MB) to 2023 (298 MB)
  (Catchpoint).
- Sources: <https://textslashplain.com/2020/09/15/browser-memory-limits/>,
  <https://medium.com/@addyosmani/chrome-now-shows-each-active-tabs-memory-usage-4f74876538e6>,
  <https://www.figma.com/blog/keeping-figma-fast/>,
  <https://medium.com/kustomerengineering/optimizing-memory-usage-in-single-page-apps-a-kustomer-case-study-de81ca9b105a>,
  <https://www.catchpoint.com/blog/benchmarking-javascript-memory-usage>.

### Chrome's tab-hover "High memory usage"

- The hover tooltip reports the tab's **private memory footprint**; no
  documented numeric threshold for the "high memory" phrasing — it is
  informational, and leak alerts ("Performance Issue Alert") are separate.
- Memory Saver (Chrome 108+) discards inactive tabs on heuristics rather than a
  documented per-tab threshold; how much a discard reclaims is whatever that tab
  held. Renderer crash points are device- and build-specific — the one figure
  Chrome does define is V8's ~4 GB per-heap ceiling on 64-bit, which is a
  separate limit from Memory Saver.
- Sources: <https://developer.chrome.com/blog/memory-and-energy-saver-mode>,
  <https://support.google.com/chrome/answer/12929150>,
  <https://developer.chrome.com/docs/devtools/memory-problems>.

### Published guidance on budgets

- Chrome team: no hard numbers — test on target devices, watch GC-pause
  degradation (RAIL). web.dev: measure in the field with
  `performance.measureUserAgentSpecificMemory()` and catch regressions on
  rollout rather than fixed budgets.
- Composition rule of thumb from published analyses: framework/code overhead
  is typically <100–150 MB; growth beyond that is data, DOM, and caches.
  Collaboration/CRDT machinery adds 40–70% over a stateless baseline
  (Kustomer).

### Verdict for Composer

An empty tab at ~470–540 MB footprint is **high-end-of-normal, verging on
outlier** — comparable apps sit at 150–500 MB initialized. Multi-GB is normal
only _with data loaded_ (Figma/Notion class). So: the ~470 MB empty floor is
worth reducing but not anomalous for an app of this scope; the pre-fix
multi-GB-with-small-mailbox behavior WAS anomalous (and is what we fixed /
are fixing).

## Pass 2 — engineering postmortems & write-ups

### Figma — memory optimizations in Rust/WASM (2025)

<https://www.figma.com/blog/supporting-faster-file-load-times-with-memory-optimizations-in-rust/>

- Replaced BTreeMaps with flat sorted vectors for node properties → 20% fleet
  memory savings; large files ~25% reduction.
- Key constraint they call out: **WASM memory is grow-only and permanent** —
  matches our automerge-wasm observation.

### Gmail — managing memory at scale (web.dev)

<https://web.dev/articles/effectivemanagement>

- Field telemetry via `performance.memory` across millions of users; dominant
  leak sources: **unbounded caches, ever-growing callback arrays, stale event
  listeners** — the same classes we found.
- P99 users: 80% less memory after fixes; median ~50%.
- Larger footprint correlated with worse latency (GC pauses) — memory is a
  responsiveness issue, not just RAM.

### Slack — reducing memory footprint

<https://slack.engineering/reducing-slacks-memory-footprint/>

- Built a ~1,200-line "tiny background client" for inactive workspaces
  (unreads + notifications only) instead of a full app instance per
  workspace; server-side unread tracking. Big P10/P50/P99 reductions.
- Relevant model for Composer: a tab doesn't need the full engine when idle.

### Meta — MemLab (2022)

<https://engineering.fb.com/2022/09/12/open-source/memlab/>

- Automated leak detection: scripted navigation, heap snapshot diffing,
  retainer-trace clustering, React-Fiber-aware filtering.
- Catches: detached DOM, unbounded caches, un-virtualized infinite lists,
  missed string interning. Used as CI guardrail at Meta.

### V8 — optimizing V8 memory (v8.dev)

<https://v8.dev/blog/optimizing-v8-memory>

- Engine-side context: page-size reduction, zone allocators, low-memory mode;
  ~50% V8 heap reduction on benchmarks in Chrome 53-55 era. Background for
  why committed heap ≠ live objects.

### Nolan Lawson — "Memory leaks: the forgotten side of web performance" (2022)

<https://nolanlawson.com/2022/01/05/memory-leaks-the-forgotten-side-of-web-performance/>

- Public SPAs measured leaking up to 186 MB per interaction; tooling called
  "Stone Age"; wrote `fuite` to automate leak detection (navigation loops +
  leak-source stack traces).

### Others

- Airbnb React perf fixes (re-render/memoization; unmount cleanup):
  <https://medium.com/airbnb-engineering/recent-web-performance-fixes-on-airbnb-listing-pages-6cd8d93df6f4>
- SPA leak patterns (listeners, timers, observers, caches; three-snapshot
  technique):
  <https://medium.com/@Quaxel/spa-memory-leaks-catch-them-before-users-rage-refresh-41ac7d11a373>
- Unbounded caches as a top leak class:
  <https://blog.heaphero.io/unbounded-caches-static-collections-and-unclosed-resources-the-3-killer-anti-patterns-causing-memory-leaks/>
- Chrome DevTools memory workflows:
  <https://developer.chrome.com/docs/devtools/memory-problems>
- **`performance.measure` retention warning** (the exact class we hit; Node
  services observed 4 GB+ over months):
  <https://blog.tentaclelabs.com/posts/2023/05/be-careful-with-performance-measure/>

### Recurring patterns across sources (their consensus)

1. Unbounded caches (incl. query-result caches of serialized payloads) →
   bound by size/TTL/LRU, purge on navigation.
2. Detached DOM + stale event listeners → cleanup on unmount, delegation.
3. Forgotten timers/intervals → cleanup functions.
4. Unsubscribed observers/subscriptions → disconnect on unmount.
5. Closure scope capture of large objects → destructure, null out.
6. **performance.mark/measure accumulation → clearMarks/clearMeasures or
   bounded buffers.**
7. Re-render churn (unstable function identities) → memoization.
8. Un-virtualized long lists → windowing.

Mapping to our findings: we hit #1 (documentJson/`#state` copies), #6
(135k retained measures), and the structural analog of #8 (planks stay
mounted). Gmail/MemLab both validate the field-telemetry + snapshot-diff
methodology we used, and MemLab/fuite are the off-the-shelf versions of the
harness we built.

## Pass 3 — strategies & tooling playbook (condensed; most relevant to Composer)

### Code footprint

- Code splitting/lazy loading and _not loading disabled features_ are the
  canonical levers (<https://web.dev/learn/performance/code-split-javascript>);
  V8 lazy-parses uncalled functions and can flush bytecode for them, so code
  that is _loaded but never run_ is cheaper than run-once code — loading less
  remains the only real fix (<https://v8.dev/blog/preparser>).

### Data / caches

- LRU caches with **byte budgets**; WeakRef/FinalizationRegistry for
  memory-only caches (no promptness guarantees:
  <https://v8.dev/features/weak-references>).
- IndexedDB as a spill target — Chrome Snappy-compresses large values 2–5×
  (<https://developer.chrome.com/docs/chromium/indexeddb-storage-improvements>).
- Virtualize long lists; paginate + release, don't accumulate
  (<https://developer.chrome.com/blog/infinite-scroller>).

### Worker/WASM

- **Transferables are ~45× cheaper than structured clone** for big buffers
  (302 ms vs 6.6 ms for 32 MB —
  <https://developer.chrome.com/blog/transferable-objects-lightning-fast>) —
  directly relevant to our poll-payload churn.
- WASM linear memory never shrinks; the escape hatch is **instantiate in a
  worker and terminate to reclaim** (<https://v8.dev/blog/4gb-wasm-memory>).
  Figma-class apps bound WASM residency by keeping only active content in the
  heap and spilling the rest.
- Google Sheets moved its calc worker to WasmGC
  (<https://web.dev/case-studies/google-sheets-wasmgc>).

### Measurement / regression

- Field telemetry: `performance.measureUserAgentSpecificMemory()` (requires
  COOP/COEP; result at next GC —
  <https://web.dev/articles/monitor-total-page-memory-usage>).
- CI: MemLab scenario runs with snapshot diff + growth thresholds
  (<https://github.com/facebook/memlab>); statistical aggregation needed —
  variance is real (matches our own budget-check experience).
- Chrome 151 DevTools: Detached Elements profile, 4× faster snapshots.

### Engine levers

- No direct GC knobs in-browser; give the engine idle time
  (`requestIdleCallback`, `scheduler.yield`), free large objects proactively.
- Memory Saver discards background tabs (handle `document.wasDiscarded`);
  Energy Saver freezes hidden CPU-heavy tabs — apps should tolerate
  freeze/resume (<https://developer.chrome.com/blog/memory-and-energy-saver-mode>).

Full three-pass agent reports available in the session transcripts; this file
keeps the durable summary.
