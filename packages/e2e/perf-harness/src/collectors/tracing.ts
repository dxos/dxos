//
// Copyright 2026 DXOS.org
//

import { once } from 'node:events';
import { createReadStream, createWriteStream, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createGunzip } from 'node:zlib';

import { type Cdp } from '../cdp.ts';
import { type RealmCpu, type TargetKind } from '../types.ts';

/**
 * Categories, kept to the minimum that yields the numbers.
 *
 * `toplevel` is where per-thread task boundaries come from, `__metadata` names the threads so a
 * thread can be labelled a realm, and `blink.user_timing` carries the stage marks. Deliberately NO
 * `disabled-by-default-v8.cpu_profiler`: that category IS the V8 sampling profiler, so enabling it
 * alongside the `Profiler` domain would run two sampling sessions over the same isolates.
 */
const MEASURE_CATEGORIES = ['toplevel', 'blink.user_timing', '__metadata'];

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
  /** Compressed bytes received, so the cost of keeping a trace is a measured figure. */
  bytes: number;
  file?: string;
  /** Non-zero only if the browser ignored `ReturnAsStream`, which would mean the trace was lost. */
  inlineEvents: number;
};

type TraceEvent = {
  name?: string;
  ph?: string;
  pid?: number;
  tid?: number;
  ts?: number;
  dur?: number;
  args?: { name?: string };
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
  options: { mode: 'measure' | 'diagnose'; outputDir: string },
): Promise<TraceSession> => {
  let inlineEvents = 0;
  let streamHandle: string | undefined;
  let complete: () => void = () => {};
  const completed = new Promise<void>((resolve) => {
    complete = resolve;
  });

  // Only fires if the browser declines the stream, which `ReturnAsStream` should prevent; counted
  // rather than collected so a silent fallback is visible instead of doubling memory.
  browserCdp.on('Tracing.dataCollected', (params: { value?: TraceEvent[] }) => {
    inlineEvents += params?.value?.length ?? 0;
  });
  browserCdp.on('Tracing.tracingComplete', (params: { stream?: string }) => {
    streamHandle = params?.stream;
    complete();
  });

  await browserCdp.send('Tracing.start', {
    traceConfig: {
      recordMode: 'recordAsMuchAsPossible',
      includedCategories: options.mode === 'diagnose' ? DIAGNOSE_CATEGORIES : MEASURE_CATEGORIES,
    },
    // A stream rather than `ReportEvents`: the same trace arrived as 3,680 websocket chunks of raw
    // JSON in a probe, and gzip is applied before transfer rather than after.
    transferMode: 'ReturnAsStream',
    streamCompression: 'gzip',
  });

  const finish = async (): Promise<TraceResult> => {
    await browserCdp.send('Tracing.end');
    await completed;

    if (!streamHandle) {
      // `ReturnAsStream` is requested, so no handle means the browser dropped the trace rather
      // than that it arrived some other way. Reported rather than logged: this package takes no
      // dependency beyond Playwright, so the caller owns the logging.
      return { byStage: new Map(), bytes: 0, inlineEvents };
    }

    // Spooled to disk, then scanned twice from disk, because the trace does not fit in memory: a
    // 4.7-minute run produced more than Node's 512MB string cap UNCOMPRESSED, so neither
    // `gunzipSync(...).toString()` nor a single in-memory event array is possible. Pass one takes
    // the thread names and stage marks (both tiny, both scattered through the file); pass two sums
    // task durations into the windows pass one found.
    mkdirSync(options.outputDir, { recursive: true });
    const file = path.join(options.outputDir, 'trace.json.gz');
    const sink = createWriteStream(file);
    let bytes = 0;
    for (;;) {
      const chunk = await browserCdp.send<{ data: string; base64Encoded?: boolean; eof: boolean }>('IO.read', {
        handle: streamHandle,
        size: 4 * 1024 * 1024,
      });
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

    const byStage = await readTrace(file);

    if (options.mode === 'measure') {
      // The numbers are the deliverable in `measure`; the trace itself is a diagnose artifact.
      rmSync(file, { force: true });
      return { byStage, bytes, inlineEvents };
    }
    return { byStage, bytes, file, inlineEvents };
  };

  return { finish };
};

/**
 * Per-stage, per-realm task time from a trace file on disk.
 *
 * Exported so a saved `trace.json.gz` artifact can be re-read after the fact — the numbers are
 * two streaming passes over the file and need no browser, so a regression can be re-examined from
 * the uploaded artifact rather than by reproducing the run.
 */
export const readTrace = async (file: string): Promise<Map<string, RealmCpu[]>> => {
  // Two passes rather than one: bucketing a task needs the thread names and the stage windows,
  // and both are scattered through the file, so nothing can be bucketed until it has been read
  // once. Both passes are streaming, so the cost is bytes read, not memory.
  const index = await scanTrace(file);
  return sumTaskTime(file, index);
};

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
 * Pass two: task time per realm inside each window.
 *
 * NOTE THE SEMANTICS: this is time spent INSIDE tasks on a thread — what `Performance.getMetrics`
 * calls `TaskDuration` — not the sampled CPU the profiler reports. A thread parked inside a task
 * waiting on I/O counts as busy here and idle there, so the two agree for a JS-bound realm and
 * diverge for one that blocks.
 */
const sumTaskTime = async (file: string, index: TraceIndex): Promise<Map<string, RealmCpu[]>> => {
  const totals = new Map<string, Map<string, { kind: TargetKind; name: string; us: number; tasks: number }>>();
  for (const window of index.windows) {
    totals.set(window.stage, new Map());
  }

  // Only complete-duration events carry task time, so the rest never reach `JSON.parse`.
  await streamEvents(
    file,
    (event) => {
      if (event.ph !== 'X' || event.ts === undefined || !event.dur) {
        return;
      }
      const threadName = index.threads.get(`${event.pid}/${event.tid}`);
      const realm = threadName ? realmOf(threadName) : undefined;
      if (!realm) {
        return;
      }
      for (const window of index.windows) {
        if (event.ts < window.from || event.ts > window.to) {
          continue;
        }
        const perRealm = totals.get(window.stage);
        if (!perRealm) {
          continue;
        }
        // Keyed by pid/tid: several dedicated workers run at once and each is its own realm, as
        // the per-target readings also treat them.
        const key = `${event.pid}/${event.tid}`;
        const entry = perRealm.get(key) ?? { kind: realm.kind, name: `${realm.name}:${key}`, us: 0, tasks: 0 };
        entry.us += event.dur;
        entry.tasks += 1;
        perRealm.set(key, entry);
      }
    },
    [Buffer.from('"ph":"X"')],
  );

  const byStage = new Map<string, RealmCpu[]>();
  for (const [stage, perRealm] of totals) {
    byStage.set(
      stage,
      [...perRealm.values()].map(({ kind, name, us, tasks }) => ({
        kind,
        name,
        cpuMs: Math.round(us / 1000),
        samples: tasks,
        idleSamples: 0,
      })),
    );
  }
  return byStage;
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
