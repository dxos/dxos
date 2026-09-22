//
// Copyright 2026 DXOS.org
//

/**
 * Which instrumentation a run carries, and therefore which of its numbers are trustworthy.
 *
 * The two modes exist because instrumentation is not free in a way that cancels out: an attached
 * CDP client makes Blink retain response bodies, which reads as linear memory growth (the finding
 * `scripts/memory/plain-soak.mjs` was written to control for), and profiling every realm alongside
 * a per-frame screencast costs an order of magnitude on a render-heavy stage. So the
 * memory-authoritative run cannot be the profiled one, and the two modes' timings never mix.
 *
 * - `measure`  — counter reads at stage boundaries only. Authoritative for memory and wall time;
 *                the only mode whose rows are trended.
 * - `diagnose` — always-on sampling profiler and screencast. Good for hotspots and visible stalls;
 *                its timings and memory are NOT comparable to `measure`, and the gap is large —
 *                on a 200-task render the same stage went from 6.8s to past a 60s timeout.
 */
export type Mode = 'measure' | 'diagnose';

/**
 * The four axes a comparison is only meaningful across when held constant, from
 * `scripts/memory/README.md` §"Comparing runs". Recorded on every row rather than assumed: a
 * trend that silently mixes `vite serve` with `vite preview` moves by ~2.5x on main-thread cost
 * alone, which reads exactly like a regression.
 */
export type Comparability = {
  /** `vite preview` over a production bundle, or `vite serve`. Never comparable to each other. */
  servingMode: 'preview' | 'dev';
  /** Which plugin set the bundle was built with (`DX_PLUGIN_SET`). */
  pluginSet: string;
  /** A first run performs onboarding and loads a different module set than a returning tab. */
  profileState: 'first-run' | 'returning';
  /** Idle time allowed after ready before the first stage; modules keep arriving for ~3 minutes. */
  settleMs: number;
  /**
   * Which instruments were attached, because neither mode is bare any more.
   *
   * The profiler runs in both modes — measured at +2.6% on the whole flow, below the run-to-run
   * noise — so that worker CPU is trended rather than diagnose-only. The screencast is what makes
   * `diagnose` timings incomparable: it costs +45%. Allocation sampling runs only on request.
   */
  instruments: `profiler${'' | '+screencast'}${'' | '+allocations'}`;
  /**
   * Stages after which a memory snapshot was taken, if any.
   *
   * A snapshot runs after its stage's row is complete, so that row is unaffected; every LATER
   * stage inherits the allocator pages the snapshot committed in the realm it serialized.
   */
  snapshotStages?: string[];
};

/** A CDP target the harness measures. Shared workers matter most: ECHO and automerge live there. */
export type TargetKind = 'page' | 'shared_worker' | 'worker' | 'service_worker';

/** Per-target JS heap, read after a forced GC so it reflects live objects rather than garbage. */
export type HeapReading = {
  kind: TargetKind;
  /** Stable short name (`page`, `shared_worker:client`), so rows join across iterations. */
  name: string;
  usedBytes: number;
  totalBytes: number;
  /** Present on targets that report it; covers typed-array/wasm backing stores. */
  backingBytes?: number;
  embedderBytes?: number;
  /**
   * Wasm linear memory this realm holds, from `@dxos/util`'s instantiation probe.
   *
   * Its own reading because no JS-heap figure counts it: `usedBytes` is the V8 heap, and a wasm
   * module's linear memory lives outside it. Before this, the only instrument that saw automerge's
   * and SQLite's memory at all was the footprint of the renderer processes, which cannot say
   * which realm holds it — a dedicated worker shares its creator's renderer.
   *
   * Absent when the realm published no probe, which is a different fact from holding no wasm —
   * `wasmInstances` is what tells them apart.
   */
  wasmBytes?: number;
  /**
   * The subset of `wasmBytes` backed by a `SharedArrayBuffer`.
   *
   * One shared memory is visible in every realm it was posted to, so a cross-realm total that adds
   * `wasmBytes` counts that allocation once per realm. `wasmBytesTotal` subtracts this.
   */
  wasmSharedBytes?: number;
  wasmInstances?: number;
  /** Bytes per creating script. NDJSON only — a module-keyed PostHog column would mint a series per bundle rename. */
  wasmByModule?: Record<string, number>;
};

/**
 * One browser process's private footprint, from a memory-infra dump.
 *
 * Private rather than resident: RSS counts the shared pages a process maps, so RSS summed over
 * Chrome's process tree multi-counts and is not a quantity. Footprints are disjoint, so the
 * renderers' can be added.
 */
export type FootprintReading = {
  pid: number;
  /** Chrome's own process name: `Browser`, `GPU Process`, `Renderer`, `Service: …`. */
  process: string;
  bytes: number;
};

/**
 * Main-thread cost attribution from `Performance.getMetrics`, as deltas over the stage.
 *
 * Seconds in CDP, milliseconds here. `taskMs` is the envelope; `scriptMs`, `layoutMs` and
 * `recalcStyleMs` partition most of it, and the difference between "automerge is slow" and "the
 * task list re-renders every row" is which of them moved.
 */
export type ThreadMetrics = {
  taskMs: number;
  scriptMs: number;
  layoutMs: number;
  recalcStyleMs: number;
  v8CompileMs: number;
  /** Cumulative CPU of the renderer's main thread and its process, per Blink's own accounting. */
  threadTimeMs: number;
  processTimeMs: number;
  layoutCount: number;
  recalcStyleCount: number;
};

/**
 * CPU a realm spent, measured by the sampling profiler.
 *
 * Present in BOTH modes: the profiler costs below the run-to-run noise, so worker CPU is trended
 * rather than diagnose-only. The instrument of last resort and the only one that reaches a worker:
 * process CPU folds a dedicated worker in with its renderer, and the `Performance` domain is absent
 * on worker targets.
 */
export type RealmCpu = {
  kind: TargetKind;
  name: string;
  /** Non-idle samples x sampling interval. */
  cpuMs: number;
  samples: number;
  /**
   * `(idle)` ticks alone. `samples - idleSamples` is the realm's actual work, which counts
   * `(program)` and `(garbage collector)` — see `IDLE_FRAMES` for why those are not idle.
   */
  idleSamples: number;
};

/** One realm's `thread` reading, labelled the way `heap[]` labels its own. */
export type RealmThreadMetrics = ThreadMetrics & {
  kind: TargetKind;
  /** The realm's script name, which is how the coordinator worker is told from the observability one. */
  name: string;
};

/**
 * One realm's timer drift.
 *
 * Per realm rather than pooled, because a pooled percentile is not attributable: page and worker
 * samples in one distribution let whichever realm samples most dilute the other, so a wedged
 * dedicated worker hides behind a calm page.
 */
export type RealmLag = {
  kind: TargetKind;
  name: string;
  p95Ms: number;
  maxMs: number;
  /** Samples over the floor. Zero means the realm was responsive, not that the probe was missing. */
  count: number;
};

/**
 * One realm's RPC timings over the stage, from the app's own timing middleware.
 *
 * The counterpart to `RealmLag` measured from real traffic rather than a synthetic timer:
 * `queueWait` is how long a request sat before this realm's event loop picked it up, which is
 * exactly what a blocked loop does to everything waiting on it. `service` is what the handler then
 * cost, and `roundTrip` — recorded in the realm that ISSUED the call — is the total the caller
 * waited, which the other two cannot add up to because they do not include the transport.
 */
export type RealmRpc = {
  kind: TargetKind;
  name: string;
  /** Requests this realm SERVED during the stage, from the running total's difference. */
  calls: number;
  queueWaitP95Ms: number;
  queueWaitMaxMs: number;
  serviceMaxMs: number;
  /** Requests this realm ISSUED during the stage. */
  clientCalls: number;
  roundTripP95Ms: number;
  roundTripMaxMs: number;
  /**
   * Samples the percentiles were taken over.
   *
   * The integrity pair with `calls`: the middleware keeps a bounded ring, so a stage that served
   * more calls than the ring holds reports a percentile over its tail rather than over all of it,
   * and `calls > samples` is the only thing that says so.
   */
  samples: number;
  clientSamples: number;
};

/**
 * SQLite's own disk I/O, from the OPFS VFS.
 *
 * The only instrument that reports this: nothing in CDP gives read/write bytes,
 * `Storage.getUsageAndQuota` gives a stored LEVEL rather than operations, and `/proc/<pid>/io`
 * counts Chrome's own traffic alongside ours. The VFS is the one layer where a byte count is
 * attributable to SQLite.
 *
 * Browser-only: node uses native SQLite with no JS VFS, so a node run reports zeroes.
 */
export type DiskMetrics = {
  readBytes: number;
  writeBytes: number;
  reads: number;
  writes: number;
  /** `jSync` calls — an fsync is the expensive operation a write amplification shows up as. */
  syncs: number;
  /**
   * How many realms published counters.
   *
   * The integrity column: `0` means nothing was instrumented, which is a different fact from
   * SQLite having done no I/O, and the two are indistinguishable from the byte columns alone.
   */
  realms: number;
};

/** Bytes split by what the request was for. The code/API split is the point. */
export type NetworkMetrics = {
  /** Scripts, stylesheets, wasm, fonts, the document itself — the cost of loading the app. */
  codeBytes: number;
  /** `fetch`/`xhr` traffic to ANY host — the cost of using the app, analytics included. */
  apiBytes: number;
  otherBytes: number;
  requests: number;
  apiRequests: number;
  /**
   * `fetch`/`xhr` bytes to the EDGE hosts alone, which is the app talking to its backend.
   *
   * Separate from `apiBytes` because that column counts analytics and any third party too, so it
   * cannot answer what the app costs the backend.
   */
  edgeApiBytes: number;
  edgeApiRequests: number;
  /**
   * WebSocket FRAME bytes to the edge hosts — ECHO's replication traffic.
   *
   * The `response` event cannot see this: a socket produces exactly one response, the 101 with an
   * empty body, so before frame accounting every data-syncing stage of the flow recorded 0 bytes
   * and 0 requests. This is the column that makes the network numbers mean anything.
   */
  edgeSocketBytes: number;
  edgeSocketFrames: number;
  /** Analytics and third-party bytes, recorded so the edge columns can be read as clean. */
  analyticsBytes: number;
};

/**
 * Responsiveness as a user would perceive it, from three independent probes.
 *
 * `longTask*`/`tbtMs` come from the page's Long Tasks API, `lag*` from a timer-drift probe in each
 * realm (the only one that can see the shared worker blocking), and `stillFrame*` from screencast
 * frame timestamps — a frame gap is the only one of the three that measures what the screen did.
 */
export type ResponsivenessMetrics = {
  longTaskCount: number;
  longTaskMaxMs: number;
  tbtMs: number;
  /** Pooled across realms; kept for continuity, but `lagByRealm` is what attributes a stall. */
  lagP95Ms: number;
  lagMaxMs: number;
  /** One entry per realm, so a stall is attributable to the page or to a specific worker. */
  lagByRealm: RealmLag[];
  /** Absent in `measure` mode, which attaches no screencast. */
  stillFrameMaxMs?: number;
  stillFrameCount?: number;
};

/** One stage of one flow, in one mode — the unit both the NDJSON row and the PostHog event carry. */
export type StageRow = {
  flow: string;
  /** Matches the `id:` of the step in the flow's `.mdl` QA test. */
  stage: string;
  stageIndex: number;
  mode: Mode;
  /** Fixture size, as a stable label (`tasks=2000,depth=3`). */
  scale: string;
  /**
   * Objects the fixture actually created.
   *
   * Its own field rather than part of `scale`: the label is the join key for a trend, so folding a
   * measured count into it would split the series the moment the count moved by one.
   */
  fixtureSize?: number;
  iteration: number;
  ok: boolean;
  error?: string;

  wallMs: number;

  /** Summed `cpuTime` delta across every Chrome process — includes the shared worker and GPU. */
  cpuMsTotal: number;
  cpuMsByProcess: Record<string, number>;
  thread: ThreadMetrics;
  /**
   * The same accounting per realm, so worker cost is separable from the page's.
   *
   * `thread` above is the page alone. `cpuMsByProcess` separates a SHARED worker, which gets its
   * own process, but a dedicated worker runs as a thread inside the renderer process and is
   * invisible there — this is the only field that attributes it.
   */
  threadByRealm: RealmThreadMetrics[];
  /** Profiler-measured CPU per realm, page and workers alike. Present in both modes. */
  cpuMsByRealm?: RealmCpu[];
  /**
   * The same quantity read from a browser-wide trace instead, for as long as both instruments run.
   *
   * Backfilled after the flow, because a trace cannot be rotated per stage. It measures TASK TIME
   * rather than sampled CPU, and it covers `boot`, which the profiler cannot. Kept beside
   * `cpuMsByRealm` while the two are being compared.
   */
  tracedCpuMsByRealm?: RealmCpu[];

  heap: HeapReading[];
  heapUsedTotalBytes: number;
  /** Private footprint of every browser process at the stage's end. Empty if the read failed. */
  footprint: FootprintReading[];
  /** Footprint of the renderers, which is the app. The headline memory number. */
  appFootprintBytes: number;
  domNodes: number;
  domListeners: number;
  domDocuments: number;

  network: NetworkMetrics;
  /** SQLite's VFS-level disk I/O for this stage. Zeroes on node, which has no JS VFS. */
  disk: DiskMetrics;
  /** RPC queue wait, service and round trip per realm. Empty when no realm published the counters. */
  rpc: RealmRpc[];
  responsiveness: ResponsivenessMetrics;

  comparability: Comparability;
  /** Paths of artifacts this stage produced (`.cpuprofile`, frames). Never sent to PostHog. */
  artifacts?: string[];
};
