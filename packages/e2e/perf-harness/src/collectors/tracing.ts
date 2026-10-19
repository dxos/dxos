//
// Copyright 2026 DXOS.org
//

import { once } from 'node:events';
import { createReadStream, createWriteStream, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createGunzip } from 'node:zlib';

import { type Cdp } from '../cdp.ts';
import {
  type RealmCpu,
  type RealmInstructions,
  type RenderCounters,
  type TargetKind,
  type TraceCounters,
} from '../types.ts';

/**
 * Categories, kept to the minimum that yields the numbers.
 *
 * `toplevel` is where per-thread task boundaries come from, `__metadata` names the threads so a
 * thread can be labelled a realm, and `blink.user_timing` carries the stage marks. Deliberately NO
 * `disabled-by-default-v8.cpu_profiler`: that category IS the V8 sampling profiler, so enabling it
 * alongside the `Profiler` domain would run two sampling sessions over the same isolates.
 */
const MEASURE_CATEGORIES = ['toplevel', 'blink.user_timing', '__metadata'];

/**
 * What the per-stage counter trace records: `devtools.timeline` carries `UpdateLayoutTree`, `Layout`
 * and the script events a forced layout nests in, `toplevel` carries the task events Chrome stamps
 * with an instruction delta, and the marks bound the stage.
 */
export const COUNTER_CATEGORIES = ['devtools.timeline', 'toplevel', 'blink.user_timing', '__metadata'];

/** Adds what DevTools needs to render flame charts, for an artifact a human will open. */
const DIAGNOSE_CATEGORIES = [...MEASURE_CATEGORIES, 'devtools.timeline', 'disabled-by-default-v8.cpu_profiler'];

/** Prefix of the marks that delimit stages; `perf-stage:<id>:begin` / `:end`. */
export const STAGE_MARK_PREFIX = 'perf-stage:';

export type TraceSession = {
  /** Per-stage CPU per realm, available only once the whole trace has been read. */
  finish: () => Promise<TraceResult>;
};

export type TraceResult = {
  /** Keyed by stage id, in the order the marks appeared. */
  byStage: Map<string, RealmCpu[]>;
  /** Rendering counts and instructions per stage, from the same pass. */
  countersByStage: Map<string, TraceCounters>;
  /** Compressed bytes received, so the cost of keeping a trace is a measured figure. */
  bytes: number;
  file?: string;
  /** Non-zero only if the browser ignored `ReturnAsStream`, which would mean the trace was lost. */
  inlineEvents: number;
};

type TraceEvent = {
  name?: string;
  cat?: string;
  ph?: string;
  pid?: number;
  tid?: number;
  ts?: number;
  dur?: number;
  /** Instructions the thread retired inside the event, with `--enable-thread-instruction-count`. */
  tidelta?: number;
  args?: {
    name?: string;
    elementCount?: number;
    beginData?: { dirtyObjects?: number };
  };
};

/**
 * One browser-wide trace covering BOOT, sliced by user-timing marks.
 *
 * Why a trace rather than the `Profiler` domain: tracing starts BEFORE the first navigation and is
 * browser-wide, so it covers `boot` and every worker that boot creates — the window the profiler
 * structurally cannot reach, since there is no target to attach to until the page exists.
 *
 * Why boot ONLY: at `toplevel` granularity boot alone emits ~35,000 tasks and fills Chrome's trace
 * buffer, after which recording silently stops. A whole-run trace measured 806 MB uncompressed and
 * contained the boot marks and not one mark from the nine stages that followed, so the caller ends
 * the trace as soon as boot closes. Every later stage is the profiler's to attribute.
 *
 * Started once and read once: a trace cannot be rotated per stage the way a profile can, which is
 * why stage attribution is post-processing rather than a boundary read.
 */
export const startTracing = async (
  browserCdp: Cdp,
  options: {
    mode: 'measure' | 'diagnose';
    outputDir: string;
    /** Adds `devtools.timeline`, so `countersByStage` carries rendering counts as well as task time. */
    counters?: boolean;
  },
): Promise<TraceSession> => {
  const base = options.mode === 'diagnose' ? DIAGNOSE_CATEGORIES : MEASURE_CATEGORIES;
  const recording = await recordTrace(browserCdp, {
    categories: options.counters ? [...new Set([...base, ...COUNTER_CATEGORIES])] : base,
  });

  const finish = async (): Promise<TraceResult> => {
    // Spooled to disk, then scanned twice from disk, because the trace does not fit in memory: a
    // 4.7-minute run produced more than Node's 512MB string cap UNCOMPRESSED, so neither
    // `gunzipSync(...).toString()` nor a single in-memory event array is possible. Pass one takes
    // the thread names and stage marks (both tiny, both scattered through the file); pass two sums
    // task durations into the windows pass one found.
    const file = path.join(options.outputDir, 'trace.json.gz');
    const { bytes, inlineEvents, dataLoss, written } = await recording.stop(file);
    if (!written) {
      // `ReturnAsStream` is requested, so no handle means the browser dropped the trace rather
      // than that it arrived some other way. Reported rather than logged: this package takes no
      // dependency beyond Playwright, so the caller owns the logging.
      return { byStage: new Map(), countersByStage: new Map(), bytes: 0, inlineEvents };
    }

    const { cpu: byStage, counters: countersByStage } = await readTraceWork(file, { dataLoss });

    if (options.mode === 'measure') {
      // The numbers are the deliverable in `measure`; the trace itself is a diagnose artifact.
      rmSync(file, { force: true });
      return { byStage, countersByStage, bytes, inlineEvents };
    }
    return { byStage, countersByStage, bytes, file, inlineEvents };
  };

  return { finish };
};

type Recording = {
  /** Ends the trace and spools it to `file`; `written` is false when the browser returned no stream. */
  stop: (file: string) => Promise<{ bytes: number; inlineEvents: number; dataLoss: boolean; written: boolean }>;
};

/** Bounds every command of a per-stage trace, since a stalled one would hold the stage open. */
const TRACE_COMMAND_TIMEOUT_MS = 30_000;

/**
 * Starts a browser-wide trace streamed back gzipped, for {@link startTracing} and {@link startCounterTrace}.
 *
 * Its listeners are removed when it stops: the footprint reads record their own traces between
 * stages, and a listener left behind would take their completion for this one's.
 */
const recordTrace = async (browserCdp: Cdp, { categories }: { categories: readonly string[] }): Promise<Recording> => {
  let inlineEvents = 0;
  let streamHandle: string | undefined;
  let dataLoss = false;
  let complete: () => void = () => {};
  const completed = new Promise<void>((resolve) => {
    complete = resolve;
  });

  // Only fires if the browser declines the stream, which `ReturnAsStream` should prevent; counted
  // rather than collected so a silent fallback is visible instead of doubling memory.
  const onData = (params: { value?: TraceEvent[] }) => {
    inlineEvents += params?.value?.length ?? 0;
  };
  const onComplete = (params: { stream?: string; dataLossOccurred?: boolean }) => {
    streamHandle = params?.stream;
    dataLoss = params?.dataLossOccurred === true;
    complete();
  };
  browserCdp.on('Tracing.dataCollected', onData);
  browserCdp.on('Tracing.tracingComplete', onComplete);

  try {
    await browserCdp.send(
      'Tracing.start',
      {
        traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: [...categories] },
        // A stream rather than `ReportEvents`: the same trace arrived as 3,680 websocket chunks of raw
        // JSON in a probe, and gzip is applied before transfer rather than after.
        transferMode: 'ReturnAsStream',
        streamCompression: 'gzip',
      },
      { timeoutMs: TRACE_COMMAND_TIMEOUT_MS },
    );
  } catch (error) {
    browserCdp.off('Tracing.dataCollected', onData);
    browserCdp.off('Tracing.tracingComplete', onComplete);
    throw error;
  }

  const stop: Recording['stop'] = async (file) => {
    try {
      await browserCdp.send('Tracing.end', {}, { timeoutMs: TRACE_COMMAND_TIMEOUT_MS });
      await completed;
    } finally {
      browserCdp.off('Tracing.dataCollected', onData);
      browserCdp.off('Tracing.tracingComplete', onComplete);
    }
    if (!streamHandle) {
      return { bytes: 0, inlineEvents, dataLoss, written: false };
    }
    mkdirSync(path.dirname(file), { recursive: true });
    const sink = createWriteStream(file);
    let bytes = 0;
    for (;;) {
      const chunk = await browserCdp.send<{ data: string; base64Encoded?: boolean; eof: boolean }>(
        'IO.read',
        { handle: streamHandle, size: 4 * 1024 * 1024 },
        { timeoutMs: TRACE_COMMAND_TIMEOUT_MS },
      );
      if (chunk.data) {
        const buffer = Buffer.from(chunk.data, chunk.base64Encoded === false ? 'utf8' : 'base64');
        bytes += buffer.length;
        if (!sink.write(buffer)) {
          await once(sink, 'drain');
        }
      }
      if (chunk.eof) {
        break;
      }
    }
    sink.end();
    await once(sink, 'finish');
    await browserCdp.send('IO.close', { handle: streamHandle }).catch(() => undefined);
    return { bytes, inlineEvents, dataLoss, written: true };
  };

  return { stop };
};

export type CounterTrace = {
  /** Ends the trace and returns the counts inside the stage's marks; undefined if nothing came back. */
  stop: () => Promise<TraceCounters | undefined>;
};

/**
 * A trace around ONE stage, for the counts no counter API reports: elements restyled, objects laid
 * out, layouts forced by script, and instructions retired per thread.
 *
 * Per stage rather than per run because a whole-run trace fills Chrome's buffer during boot (see
 * {@link startTracing}). Starting one fails while another trace records — the boot trace, or a
 * footprint read — which the caller treats as "no counters for this stage" rather than an error.
 * Only the events between the stage's own marks count, so the harness's boundary reads around them
 * do not.
 */
export const startCounterTrace = async (
  browserCdp: Cdp,
  { stage, outputDir }: { stage: string; outputDir: string },
): Promise<CounterTrace> => {
  const recording = await recordTrace(browserCdp, { categories: COUNTER_CATEGORIES });
  return {
    stop: async () => {
      const file = path.join(outputDir, `counters-${stage.replace(/[^a-z0-9-]+/gi, '_')}.json.gz`);
      try {
        const { written, dataLoss } = await recording.stop(file);
        if (!written) {
          return undefined;
        }
        const { counters } = await readTraceWork(file, { dataLoss });
        return counters.get(stage);
      } finally {
        rmSync(file, { force: true });
      }
    },
  };
};

/**
 * Per-stage, per-realm task time from a trace file on disk.
 *
 * Exported so a saved `trace.json.gz` artifact can be re-read after the fact — the numbers are
 * two streaming passes over the file and need no browser, so a regression can be re-examined from
 * the uploaded artifact rather than by reproducing the run.
 */
export const readTrace = async (file: string): Promise<Map<string, RealmCpu[]>> =>
  // Two passes rather than one: bucketing a task needs the thread names and the stage windows,
  // and both are scattered through the file, so nothing can be bucketed until it has been read
  // once. Both passes are streaming, so the cost is bytes read, not memory.
  (await readTraceWork(file)).cpu;

/** Byte patterns a pass cares about, so only the matching events are ever parsed. */
const TRACE_EVENTS_KEY = Buffer.from('"traceEvents"');
/** Past this without finding the key, the document is not a Chrome trace. */
const MAX_HEADER_BYTES = 1 << 20;
const ARRAY_OPEN = 0x5b;
const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const BRACE_OPEN = 0x7b;
const BRACE_CLOSE = 0x7d;

/**
 * Reads the gzipped trace, handing each complete event object to `onEvent`.
 *
 * Operates on BYTES rather than a string: indexing a string per character allocates a
 * single-character string per byte, which on an 806 MB trace is ~800M allocations.
 *
 * `needles` is a byte-level prefilter — an event whose bytes contain none of them is skipped
 * without being parsed, which matters because only ~2.7M of the objects are of interest and
 * `JSON.parse` is the expensive part.
 */
const streamEvents = async (file: string, onEvent: (event: TraceEvent) => void, needles: Buffer[]): Promise<void> => {
  const source = createReadStream(file, { highWaterMark: 1 << 22 }).pipe(createGunzip({ chunkSize: 1 << 22 }));
  // A hand-rolled object splitter rather than a JSON parser: the only structure needed is "where
  // does this object end", which depth counting answers without materializing anything larger
  // than a single event.
  let tail = Buffer.alloc(0);
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  // Chrome emits `{"traceEvents":[...],"metadata":{...}}`, NOT a bare array. Without skipping past
  // that opening `[`, the document's own `{` opens an object that only closes at EOF, so the whole
  // file is buffered and exactly one "event" is ever yielded — which is why this collector
  // produced no numbers at all.
  let entered = false;

  for await (const chunk of source) {
    // Concatenates the straddling remainder only, never the whole file — enforced below for the
    // header search too, which is the one place that could otherwise accumulate without bound.
    let buffer = tail.length ? Buffer.concat([tail, chunk]) : chunk;
    if (!entered) {
      const key = buffer.indexOf(TRACE_EVENTS_KEY);
      const open = key < 0 ? -1 : buffer.indexOf(ARRAY_OPEN, key);
      if (open < 0) {
        // A file that never contains the key would otherwise be concatenated whole and then read
        // as zero events — the same unbounded-buffer failure this parser was rewritten to remove,
        // and reachable from `readTrace` on any saved artifact that is truncated or not a Chrome
        // trace. The marker appears in the first few hundred bytes of a real trace.
        if (buffer.length > MAX_HEADER_BYTES) {
          throw new Error(
            `not a Chrome trace: no "traceEvents" array in the first ${MAX_HEADER_BYTES} bytes of ${file}`,
          );
        }
        tail = buffer;
        continue;
      }
      buffer = buffer.subarray(open + 1);
      entered = true;
    }

    for (let index = 0; index < buffer.length; index++) {
      const byte = buffer[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (byte === BACKSLASH) {
          escaped = true;
        } else if (byte === QUOTE) {
          inString = false;
        }
        continue;
      }
      if (byte === QUOTE) {
        inString = true;
      } else if (byte === BRACE_OPEN) {
        if (depth === 0) {
          start = index;
        }
        depth += 1;
      } else if (byte === BRACE_CLOSE) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          // Bounded to this object: `buffer.indexOf(needle, start)` would scan on to the end of the
          // chunk for every event that does not match, which is quadratic in chunk size.
          const event = buffer.subarray(start, index + 1);
          if (needles.some((needle) => event.indexOf(needle) >= 0)) {
            try {
              onEvent(JSON.parse(event.toString('utf8')));
            } catch {
              // A truncated trace's last object is not a measurement failure.
            }
          }
          start = -1;
        }
      }
    }

    // Keep only the partial object straddling the chunk boundary. The retained bytes are
    // re-scanned from 0 next chunk, so the scanner state must be reset to what it was AT `start`
    // — depth 0, outside a string, by construction of a depth-0 `{`. Carrying the running state
    // instead double-counted every brace in the tail, so depth drifted up and never returned to
    // 0: the tail never drained, giving unbounded memory and quadratic work (measured at 5m44s
    // and 1.5 GB, while silently dropping 98% of the events).
    tail = start >= 0 ? buffer.subarray(start) : Buffer.alloc(0);
    if (start >= 0) {
      start = 0;
      depth = 0;
      inString = false;
      escaped = false;
    }
  }
};

type TraceIndex = {
  threads: Map<string, string>;
  windows: Array<{ stage: string; from: number; to: number }>;
};

/** Pass one: thread names and stage windows, both needed before any task can be bucketed. */
const scanTrace = async (file: string): Promise<TraceIndex> => {
  const threads = new Map<string, string>();
  const open = new Map<string, number>();
  const windows: Array<{ stage: string; from: number; to: number }> = [];

  // Pass one needs only the thread-name metadata and the stage marks — a few hundred objects out
  // of millions — so everything else is rejected on bytes and never parsed.
  await streamEvents(
    file,
    (event) => {
      if (event.name === 'thread_name' && event.args?.name) {
        threads.set(`${event.pid}/${event.tid}`, event.args.name);
        return;
      }
      if (typeof event.name !== 'string' || !event.name.startsWith(STAGE_MARK_PREFIX) || event.ts === undefined) {
        return;
      }
      const rest = event.name.slice(STAGE_MARK_PREFIX.length);
      const edge = rest.slice(rest.lastIndexOf(':') + 1);
      const stage = rest.slice(0, rest.lastIndexOf(':'));
      if (edge === 'begin') {
        open.set(stage, event.ts);
      } else if (edge === 'end') {
        const from = open.get(stage);
        if (from !== undefined) {
          windows.push({ stage, from, to: event.ts });
          open.delete(stage);
        }
      }
    },
    [Buffer.from('"thread_name"'), Buffer.from(STAGE_MARK_PREFIX)],
  );

  return { threads, windows };
};

/**
 * Script events a layout can nest in. A `Layout` inside one ran synchronously because the script
 * read geometry it had invalidated — DevTools' "forced reflow" — rather than in the frame's own
 * rendering step.
 */
const SCRIPT_EVENTS: ReadonlySet<string> = new Set([
  'FunctionCall',
  'EvaluateScript',
  'TimerFire',
  'EventDispatch',
  'FireAnimationFrame',
  'FireIdleCallback',
  'RunMicrotasks',
  'XHRReadyStateChange',
  'XHRLoad',
]);

type Interval = { from: number; to: number };

type StageWork = {
  tasks: Map<string, { kind: TargetKind; name: string; us: number; tasks: number }>;
  render: RenderCounters;
  /** Per thread: task intervals with their instruction deltas, reduced to the outermost later. */
  instructionTasks: Map<string, { kind: TargetKind; tasks: Array<Interval & { instructions: number }> }>;
  scripts: Map<string, Interval[]>;
  layouts: Map<string, number[]>;
  events: number;
};

const emptyRender = (): RenderCounters => ({
  styleRecalcs: 0,
  styleRecalcElements: 0,
  layouts: 0,
  layoutDirtyObjects: 0,
  forcedLayouts: 0,
});

const isTopLevel = (event: TraceEvent): boolean => event.cat?.split(',').includes('toplevel') ?? false;

/**
 * Pass two: task time per realm inside each window, plus the rendering and instruction counts.
 *
 * NOTE THE SEMANTICS: task time is time spent INSIDE tasks on a thread — what
 * `Performance.getMetrics` calls `TaskDuration` — not the sampled CPU the profiler reports. A thread
 * parked inside a task waiting on I/O counts as busy here and idle there, so the two agree for a
 * JS-bound realm and diverge for one that blocks. Only `toplevel` events count toward it, so adding
 * `devtools.timeline` to a trace does not add its nested events to the task time.
 */
const sumStageWork = async (file: string, index: TraceIndex): Promise<Map<string, StageWork>> => {
  const byStage = new Map<string, StageWork>();
  for (const window of index.windows) {
    byStage.set(window.stage, {
      tasks: new Map(),
      render: emptyRender(),
      instructionTasks: new Map(),
      scripts: new Map(),
      layouts: new Map(),
      events: 0,
    });
  }

  // Only complete-duration events carry task time and counts, so the rest never reach `JSON.parse`.
  await streamEvents(
    file,
    (event) => {
      if (event.ph !== 'X' || event.ts === undefined) {
        return;
      }
      const threadName = index.threads.get(`${event.pid}/${event.tid}`);
      const realm = threadName ? realmOf(threadName) : undefined;
      if (!realm) {
        return;
      }
      // Keyed by pid/tid: several dedicated workers run at once and each is its own realm, as
      // the per-target readings also treat them.
      const key = `${event.pid}/${event.tid}`;
      const ts = event.ts;
      const topLevel = isTopLevel(event);
      for (const window of index.windows) {
        if (ts < window.from || ts > window.to) {
          continue;
        }
        const work = byStage.get(window.stage);
        if (!work) {
          continue;
        }
        work.events += 1;
        if (topLevel && event.dur) {
          const entry = work.tasks.get(key) ?? { kind: realm.kind, name: `${realm.name}:${key}`, us: 0, tasks: 0 };
          entry.us += event.dur;
          entry.tasks += 1;
          work.tasks.set(key, entry);
        }
        if (topLevel && event.tidelta !== undefined) {
          const thread = work.instructionTasks.get(key) ?? { kind: realm.kind, tasks: [] };
          thread.tasks.push({ from: ts, to: ts + (event.dur ?? 0), instructions: event.tidelta });
          work.instructionTasks.set(key, thread);
        }
        if (realm.kind !== 'page') {
          continue;
        }
        if (event.name === 'UpdateLayoutTree') {
          work.render.styleRecalcs += 1;
          work.render.styleRecalcElements += event.args?.elementCount ?? 0;
        } else if (event.name === 'Layout') {
          work.render.layouts += 1;
          work.render.layoutDirtyObjects += event.args?.beginData?.dirtyObjects ?? 0;
          const layouts = work.layouts.get(key) ?? [];
          layouts.push(ts);
          work.layouts.set(key, layouts);
        } else if (event.name !== undefined && SCRIPT_EVENTS.has(event.name)) {
          const scripts = work.scripts.get(key) ?? [];
          scripts.push({ from: ts, to: ts + (event.dur ?? 0) });
          work.scripts.set(key, scripts);
        }
      }
    },
    [Buffer.from('"ph":"X"')],
  );

  return byStage;
};

/**
 * Sorted, disjoint union of intervals, so containment is one binary search.
 *
 * Exported for its test; nesting is the case it exists for, since script events nest in each other.
 */
export const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = [...intervals].sort((left, right) => left.from - right.from);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (last && interval.from <= last.to) {
      last.to = Math.max(last.to, interval.to);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
};

const contains = (merged: Interval[], ts: number): boolean => {
  let low = 0;
  let high = merged.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (ts < merged[middle].from) {
      high = middle - 1;
    } else if (ts > merged[middle].to) {
      low = middle + 1;
    } else {
      return true;
    }
  }
  return false;
};

/**
 * Instructions of the OUTERMOST tasks only: `toplevel` events nest (a mojo message inside a run
 * task), and each carries its own delta, so summing every one would count the inner work twice.
 */
export const outermostInstructions = (tasks: Array<Interval & { instructions: number }>): number => {
  const sorted = [...tasks].sort((left, right) => left.from - right.from || right.to - left.to);
  let total = 0;
  let coveredTo = Number.NEGATIVE_INFINITY;
  for (const task of sorted) {
    if (task.from < coveredTo) {
      continue;
    }
    total += task.instructions;
    coveredTo = task.to;
  }
  return total;
};

const toCpu = (work: StageWork): RealmCpu[] =>
  [...work.tasks.values()].map(({ kind, name, us, tasks }) => ({
    kind,
    name,
    cpuMs: Math.round(us / 1000),
    samples: tasks,
    idleSamples: 0,
  }));

const toCounters = (work: StageWork, dataLoss: boolean): TraceCounters => {
  let forcedLayouts = 0;
  for (const [thread, layouts] of work.layouts) {
    const scripts = mergeIntervals(work.scripts.get(thread) ?? []);
    forcedLayouts += layouts.filter((ts) => contains(scripts, ts)).length;
  }
  const byKind = new Map<TargetKind, RealmInstructions>();
  for (const { kind, tasks } of work.instructionTasks.values()) {
    const entry = byKind.get(kind) ?? { kind, instructions: 0, threads: 0 };
    entry.instructions += outermostInstructions(tasks);
    entry.threads += 1;
    byKind.set(kind, entry);
  }
  return {
    render: { ...work.render, forcedLayouts },
    instructions: [...byKind.values()],
    events: work.events,
    dataLoss,
  };
};

/**
 * Per-stage task time AND counters from a trace file on disk.
 *
 * Exported for the same reason as {@link readTrace}: a saved artifact re-reads without a browser.
 */
export const readTraceWork = async (
  file: string,
  { dataLoss = false }: { dataLoss?: boolean } = {},
): Promise<{ cpu: Map<string, RealmCpu[]>; counters: Map<string, TraceCounters> }> => {
  const work = await sumStageWork(file, await scanTrace(file));
  const cpu = new Map<string, RealmCpu[]>();
  const counters = new Map<string, TraceCounters>();
  for (const [stage, stageWork] of work) {
    cpu.set(stage, toCpu(stageWork));
    counters.set(stage, toCounters(stageWork, dataLoss));
  }
  return { cpu, counters };
};

/** A thread's realm label, from the metadata events that name it. */
const realmOf = (threadName: string): { kind: TargetKind; name: string } | undefined => {
  switch (threadName) {
    case 'CrRendererMain':
      return { kind: 'page', name: 'page' };
    case 'DedicatedWorker thread':
      return { kind: 'worker', name: 'worker' };
    case 'SharedWorker thread':
      return { kind: 'shared_worker', name: 'shared_worker' };
    case 'ServiceWorker thread':
      return { kind: 'service_worker', name: 'service_worker' };
    default:
      return undefined;
  }
};
