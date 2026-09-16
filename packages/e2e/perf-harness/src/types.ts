//
// Copyright 2026 DXOS.org
//

/**
 * Which instrumentation a run carries, and therefore which of its numbers are trustworthy.
 *
 * The two modes exist because instrumentation is not free in a way that cancels out: an attached
 * CDP client makes Blink retain response bodies, which reads as linear memory growth (the finding
 * `scripts/memory/plain-soak.mjs` was written to control for), and the sampling profiler adds a
 * few percent to every JS frame. So the memory-authoritative run cannot be the profiled one.
 *
 * - `measure`  — counter reads at stage boundaries only. Authoritative for memory and wall time;
 *                the only mode whose rows are trended.
 * - `diagnose` — always-on sampling profiler and screencast. Authoritative for CPU attribution and
 *                hotspots; its memory columns are recorded but flagged `instrumented` and must
 *                never be compared against `measure`.
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
  /** True whenever a profiler or screencast was attached — i.e. always in `diagnose`. */
  instrumented: boolean;
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

/** Bytes split by what the request was for. The code/API split is the point. */
export type NetworkMetrics = {
  /** Scripts, stylesheets, wasm, fonts, the document itself — the cost of loading the app. */
  codeBytes: number;
  /** `fetch`/`xhr`/websocket traffic — the cost of using it. */
  apiBytes: number;
  otherBytes: number;
  requests: number;
  apiRequests: number;
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
  lagP95Ms: number;
  lagMaxMs: number;
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

  heap: HeapReading[];
  heapUsedTotalBytes: number;
  /** Peak RSS across the browser process tree during the stage. The headline memory number. */
  peakRssBytes: number;
  domNodes: number;
  domListeners: number;
  domDocuments: number;

  network: NetworkMetrics;
  responsiveness: ResponsivenessMetrics;

  comparability: Comparability;
  /** Paths of artifacts this stage produced (`.cpuprofile`, frames). Never sent to PostHog. */
  artifacts?: string[];
};
