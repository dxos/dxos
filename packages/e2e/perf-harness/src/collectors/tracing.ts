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
 * One browser-wide trace for the whole run, sliced into stages by user-timing marks.
 *
 * Why a trace rather than the `Profiler` domain: tracing starts BEFORE the first navigation and is
 * browser-wide, so it covers `boot` and every worker that boot creates — the window the profiler
 * structurally cannot reach, since there is no target to attach to until the page exists.
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

    const index = await scanTrace(file);
    const byStage = await sumTaskTime(file, index);

    if (options.mode === 'measure') {
      // The numbers are the deliverable in `measure`; the trace itself is a diagnose artifact.
      rmSync(file, { force: true });
      return { byStage, bytes, inlineEvents };
    }
    return { byStage, bytes, file, inlineEvents };
  };

  return { finish };
};

/** Reads the gzipped trace line-agnostically, handing each complete event object to `onEvent`. */
const streamEvents = async (file: string, onEvent: (event: TraceEvent) => void): Promise<void> => {
  const source = createReadStream(file).pipe(createGunzip());
  // A hand-rolled object splitter rather than a JSON parser: the file is one huge array and the
  // only structure needed is "where does this object end", which depth counting answers without
  // materializing anything larger than a single event.
  let buffer = '';
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for await (const chunk of source) {
    buffer += chunk.toString('utf8');
    for (let index = 0; index < buffer.length; index++) {
      const char = buffer[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        if (depth === 0) {
          start = index;
        }
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          try {
            onEvent(JSON.parse(buffer.slice(start, index + 1)));
          } catch {
            // A truncated trace's last object is not a measurement failure.
          }
          start = -1;
        }
      }
    }
    // Keep only the partial object straddling the chunk boundary.
    buffer = start >= 0 ? buffer.slice(start) : '';
    if (start >= 0) {
      start = 0;
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

  await streamEvents(file, (event) => {
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
  });

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

  await streamEvents(file, (event) => {
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
      // Keyed by pid/tid: several dedicated workers run at once and each is its own realm, as the
      // per-target readings also treat them.
      const key = `${event.pid}/${event.tid}`;
      const entry = perRealm.get(key) ?? { kind: realm.kind, name: `${realm.name}:${key}`, us: 0, tasks: 0 };
      entry.us += event.dur;
      entry.tasks += 1;
      perRealm.set(key, entry);
    }
  });

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
