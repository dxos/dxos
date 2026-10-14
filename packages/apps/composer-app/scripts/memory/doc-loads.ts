//
// Copyright 2026 DXOS.org
//

/**
 * Which code loads documents in the ECHO worker, from the first line it runs: the worker is held at
 * start, a non-pausing breakpoint on the host's `automerge.docLoads` counter tallies the stack that
 * reached it, and the stacks are source-mapped through the bundle. Counts and call sites only, so it
 * runs on a real profile behind the partition. `--retained` also samples the worker's allocations from
 * its first line and reports, at the end of each boot, what is still live by allocating code: sizes
 * and call sites, never values. `--sizes` buckets the bytes of each storage range load (one per
 * document), for whether a few large documents set Automerge's wasm high-water. `--syncs` counts the
 * worker's Subduction `syncWithPeer` calls per sample, beside its wasm. `--saves` counts the storage
 * adapter's saves by key kind (the second key segment: commits, blobs, remote heads), never ids.
 *
 * Usage: node scripts/memory/doc-loads.ts --archive <file.dxprofile> --dist <bundle> (--offline | --edge <url>)
 *        [--port 4530] [--debug-port 9350] [--idle-ms 180000] [--top 12] [--frames 8] [--boots 1]
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { isProductionEdgeHost, listTargets, partitionArgs, startPartitionProxy } from '@dxos/perf-harness';

import { waitForReady } from '../../src/playwright/perf/page.ts';
import { importProfileArchive } from '../../src/playwright/scenarios/memory-soak.ts';
// @ts-expect-error untyped sibling module.
import { report as allocationReport } from './alloc-report.mjs';
// @ts-expect-error untyped sibling module.
import { createFrameResolver } from './heap-attribution.mjs';
import { servePreview } from './preview.ts';

const { values } = parseArgs({
  options: {
    'archive': { type: 'string' },
    'dist': { type: 'string' },
    'edge': { type: 'string' },
    'offline': { type: 'boolean', default: false },
    'port': { type: 'string', default: '4530' },
    'debug-port': { type: 'string', default: '9350' },
    'idle-ms': { type: 'string', default: '180000' },
    'top': { type: 'string', default: '12' },
    'frames': { type: 'string', default: '8' },
    'boots': { type: 'string', default: '1' },
    'retained': { type: 'boolean', default: false },
    'sizes': { type: 'boolean', default: false },
    'syncs': { type: 'boolean', default: false },
    'saves': { type: 'boolean', default: false },
  },
});
if (!values.archive || !values.dist || values.offline === Boolean(values.edge)) {
  throw new Error('usage: doc-loads.ts --archive <file> --dist <bundle> (--offline | --edge <url>)');
}
const edgeUrl = values.offline ? 'http://127.0.0.1:9/' : values.edge!;
const edgeHost = values.offline ? undefined : new URL(edgeUrl).hostname;
if (edgeHost && isProductionEdgeHost(edgeHost)) {
  throw new Error('--edge must name a non-production EDGE');
}
const archive = path.resolve(values.archive);
const dist = path.resolve(values.dist);
try {
  execFileSync('grep', ['-rlF', edgeUrl, path.join(dist, 'assets')]);
} catch {
  throw new Error(`${dist} is not an ${values.offline ? '--offline' : `--edge ${edgeUrl}`} build`);
}
const origin = `http://127.0.0.1:${values.port}`;

const COUNTER = /[\w$]+\(["`']automerge\.docLoads["`']\)/;
const workerFile = readdirSync(path.join(dist, 'assets')).find(
  (name) =>
    /^dedicated-worker-.*\.js$/.test(name) && COUNTER.test(readFileSync(path.join(dist, 'assets', name), 'utf8')),
);
if (!workerFile) {
  throw new Error(`${dist} has no dedicated worker chunk counting automerge.docLoads`);
}
const source = readFileSync(path.join(dist, 'assets', workerFile), 'utf8');
const match = COUNTER.exec(source)!;
// The registry's `open: (documentId) => { countWork(...) ... }`: its parameter, minified.
const documentIdName = /open:([\w$]+)=>\{$/.exec(source.slice(0, match.index))?.[1];
if (!documentIdName) {
  throw new Error(`${workerFile}: the docLoads counter is not at the start of the registry's open callback`);
}
const before = source.slice(0, match.index);
const lineNumber = before.split('\n').length - 1;
const columnNumber = match.index - (before.lastIndexOf('\n') + 1);

// Each frame as `file:line:column`, so the tally holds no names or values from the page.
const CONDITION = `(() => {
  (globalThis.__dxDocIds ??= new Set()).add(${documentIdName});
  const tally = (globalThis.__dxDocLoads ??= new Map());
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 60;
  const stack = new Error().stack ?? '';
  Error.stackTraceLimit = limit;
  const key = stack.split('\\n').slice(1).map((frame) => {
    const at = /(https?:[^\\s()]+):(\\d+):(\\d+)\\)?$/.exec(frame);
    return at ? (/^\\s*at async /.test(frame) ? 'async ' : '') + at[1].split('/').pop() + ':' + at[2] + ':' + at[3] : undefined;
  }).filter(Boolean).join('|');
  tally.set(key, (tally.get(key) ?? 0) + 1);
  return false;
})()`;
// Only the size of the id set leaves the worker.
// `countWork('automerge.loadBytes', bytesLoaded)` at the end of the storage adapter's range load.
const LOAD_BYTES = /[\w$]+\(["`']automerge\.loadBytes["`'],([\w$]+)\)/;
const sizesMatch = LOAD_BYTES.exec(source);
if (values.sizes && !sizesMatch) {
  throw new Error(`${workerFile}: no automerge.loadBytes counter`);
}
const sizesLocation =
  sizesMatch &&
  (() => {
    const head = source.slice(0, sizesMatch.index);
    return { lineNumber: head.split('\n').length - 1, columnNumber: sizesMatch.index - (head.lastIndexOf('\n') + 1) };
  })();
// Power-of-two buckets from 1 KiB, and the largest single load.
const SIZES_CONDITION =
  sizesMatch &&
  `(() => {
  const h = (globalThis.__dxLoadSizes ??= { buckets: {}, max: 0 });
  const bytes = ${sizesMatch[1]};
  const bucket = bytes < 1024 ? '<1K' : '<' + (2 ** Math.ceil(Math.log2(bytes + 1) - 10)) + 'K';
  h.buckets[bucket] = (h.buckets[bucket] ?? 0) + 1;
  h.max = Math.max(h.max, bytes);
  return false;
})()`;

// Every `<subduction>.syncWithPeer(` call site in the worker chunk, counted by one shared tally.
const SYNC_CALLS = [...source.matchAll(/[\w$]+\.syncWithPeer\(/g)].map(({ index }) => {
  const head = source.slice(0, index);
  return { lineNumber: head.split('\n').length - 1, columnNumber: index - (head.lastIndexOf('\n') + 1) };
});
if (values.syncs && SYNC_CALLS.length === 0) {
  throw new Error(`${workerFile}: no syncWithPeer call sites`);
}
const SYNCS_CONDITION = `(globalThis.__dxSyncCalls = (globalThis.__dxSyncCalls ?? 0) + 1), false`;

// The storage adapter's `countWork(SAVE_COUNTERS[key[1] ?? ''] ?? 'automerge.otherSaves')`.
const SAVE_COUNTER = /[\w$]+\([\w$]+\[([\w$]+)\[1\]\?\?[`'"]{2}\]\?\?[`'"]automerge\.otherSaves[`'"]\)/;
const saveMatch = SAVE_COUNTER.exec(source);
if (values.saves && !saveMatch) {
  throw new Error(`${workerFile}: no storage save counter`);
}
const saveLocation =
  saveMatch &&
  (() => {
    const head = source.slice(0, saveMatch.index);
    return { lineNumber: head.split('\n').length - 1, columnNumber: saveMatch.index - (head.lastIndexOf('\n') + 1) };
  })();
const SAVES_CONDITION =
  saveMatch &&
  `((kinds, kind) => { kinds[kind] = (kinds[kind] ?? 0) + 1; })(globalThis.__dxSaveKinds ??= {}, String(${saveMatch[1]}[1])), false`;

const READ = `JSON.stringify({
  saves: globalThis.__dxSaveKinds ?? {},
  syncs: globalThis.__dxSyncCalls ?? 0,
  sizes: globalThis.__dxLoadSizes ?? null,
  stacks: [...(globalThis.__dxDocLoads ?? new Map())],
  distinct: globalThis.__dxDocIds?.size ?? 0,
  counters: globalThis.__dxosWorkCounters?.() ?? {},
})`;
const COUNTERS = /docLoads|loadBytes|evictions|indexPasses|indexedObjects|chunkLoads|rangeLoads/;

/** A raw CDP connection with flattened sessions, so a worker can be held before its first line runs. */
const connect = async (wsUrl: string) => {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let next = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const listeners = new Set<(message: any) => void>();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    const entry = message.id !== undefined ? pending.get(message.id) : undefined;
    if (entry) {
      pending.delete(message.id);
      message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
    } else {
      listeners.forEach((listener) => listener(message));
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  return { send, on: (listener: (message: any) => void) => listeners.add(listener), close: () => ws.close() };
};

const resolveFrame = createFrameResolver(dist) as (
  script: string,
  line: number,
  column: number,
) => { source: string; line: number; name?: string } | null;

/** A stack's frames by source, dropping the counter's own frames inside the lease registry. */
const describe = (key: string, frames: number): string => {
  const resolved = key.split('|').map((frame) => {
    const async = frame.startsWith('async ');
    const [script, line, column] = (async ? frame.slice(6) : frame).split(':');
    const at = resolveFrame(script, Number(line), Number(column) - 1);
    if (!at) {
      return `${script}:${line}`;
    }
    const file = at.source.replace(/^.*\/(packages|node_modules)\//, '$1/').replace(/^packages\//, '');
    return `${async ? 'async ' : ''}${at.name ?? '?'} ${file}:${at.line}`;
  });
  const start = resolved.findIndex((frame) => !/document-lease|automerge-host\.ts.*\b(open|acquire)\b/.test(frame));
  return resolved.slice(Math.max(0, start), Math.max(0, start) + frames).join('\n      ');
};

const main = async () => {
  const preview = await servePreview(dist, Number(values.port));
  const proxy = await startPartitionProxy({ allow: edgeHost ? [edgeHost] : [] });
  const profileDir = mkdtempSync(path.join(tmpdir(), 'dx-doc-loads-'));
  try {
    const importing = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: partitionArgs(proxy.port),
    });
    try {
      await importProfileArchive(importing.pages()[0] ?? (await importing.newPage()), origin, archive);
    } finally {
      await importing.close();
    }

    // Later boots measure a returning user: whatever the first one indexed is on disk.
    for (let boot = 1; boot <= Number(values.boots); boot++) {
      process.stdout.write(`\n== boot ${boot}\n`);
      const context = await chromium.launchPersistentContext(profileDir, {
        headless: true,
        args: [...partitionArgs(proxy.port), `--remote-debugging-port=${values['debug-port']}`],
      });
      try {
        const page = context.pages()[0] ?? (await context.newPage());
        const target = (await listTargets(Number(values['debug-port']))).find(({ type }) => type === 'page');
        if (!target?.webSocketDebuggerUrl) {
          throw new Error('no page target');
        }
        const cdp = await connect(target.webSocketDebuggerUrl);
        let workerSession: string | undefined;
        const breakpointSet = Promise.withResolvers<void>();
        cdp.on(async (message) => {
          // A worker held at start has not parsed its script, so the breakpoint binds when it does.
          if (message.method === 'Debugger.breakpointResolved' && message.sessionId === workerSession) {
            breakpointSet.resolve();
            return;
          }
          if (message.method !== 'Target.attachedToTarget') {
            return;
          }
          const { sessionId, targetInfo } = message.params;
          try {
            // Workers the ECHO worker starts are held too, so the auto-attach follows them.
            await cdp.send(
              'Target.setAutoAttach',
              { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
              sessionId,
            );
            if (targetInfo.url.includes(workerFile)) {
              workerSession = sessionId;
              await cdp.send('Debugger.enable', {}, sessionId);
              if (values.retained) {
                // Collected objects excluded, so the profile is what the worker still holds when read.
                await cdp.send('HeapProfiler.enable', {}, sessionId);
                await cdp.send(
                  'HeapProfiler.startSampling',
                  {
                    samplingInterval: 16_384,
                    includeObjectsCollectedByMajorGC: false,
                    includeObjectsCollectedByMinorGC: false,
                  },
                  sessionId,
                );
              }
              const { locations } = await cdp.send(
                'Debugger.setBreakpointByUrl',
                { urlRegex: workerFile.replace(/[.]/g, '\\.'), lineNumber, columnNumber, condition: CONDITION },
                sessionId,
              );
              if (values.saves && saveLocation) {
                await cdp.send(
                  'Debugger.setBreakpointByUrl',
                  { urlRegex: workerFile.replace(/[.]/g, '\\.'), ...saveLocation, condition: SAVES_CONDITION },
                  sessionId,
                );
              }
              for (const location of values.syncs ? SYNC_CALLS : []) {
                await cdp.send(
                  'Debugger.setBreakpointByUrl',
                  { urlRegex: workerFile.replace(/[.]/g, '\\.'), ...location, condition: SYNCS_CONDITION },
                  sessionId,
                );
              }
              if (values.sizes && sizesLocation) {
                await cdp.send(
                  'Debugger.setBreakpointByUrl',
                  { urlRegex: workerFile.replace(/[.]/g, '\\.'), ...sizesLocation, condition: SIZES_CONDITION },
                  sessionId,
                );
              }
              if (locations.length > 0) {
                breakpointSet.resolve();
              }
            }
          } catch (error) {
            breakpointSet.reject(error);
          } finally {
            await cdp.send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {});
          }
        });
        await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });

        let previous = new Map<string, number>();
        let previousDistinct = 0;
        let previousCounters: Record<string, number> = {};
        const sample = async (stage: string) => {
          const { result } = await cdp.send(
            'Runtime.evaluate',
            { expression: READ, returnByValue: true },
            workerSession,
          );
          const read: {
            saves: Record<string, number>;
            syncs: number;
            stacks: [string, number][];
            distinct: number;
            counters: Record<string, number>;
            sizes: { buckets: Record<string, number>; max: number } | null;
          } = JSON.parse(result.value);
          const now = new Map<string, number>(read.stacks);
          const counters = Object.fromEntries(
            Object.entries(read.counters)
              .filter(([name]) => COUNTERS.test(name))
              .map(([name, value]) => [name, value - (previousCounters[name] ?? 0)]),
          );
          previousCounters = read.counters;
          // Each realm's live heap after a collection, and its wasm linear memory per module.
          const realm = async (sessionId?: string) => {
            await cdp.send('HeapProfiler.collectGarbage', {}, sessionId).catch(() => {});
            const { usedSize } = await cdp.send('Runtime.getHeapUsage', {}, sessionId);
            const { result: wasm } = await cdp.send(
              'Runtime.evaluate',
              { expression: 'JSON.stringify(globalThis.__dxosWasmMemory?.()?.byModule ?? {})', returnByValue: true },
              sessionId,
            );
            const byModule = Object.entries(JSON.parse(wasm.value) as Record<string, number>)
              .map(([name, bytes]) => `${name.replace(/-[\w]+\.wasm$/, '')} ${Math.round(bytes / 1048576)}`)
              .join(', ');
            return `heap ${Math.round(usedSize / 1048576)} MiB, wasm ${byModule || 'none'}`;
          };
          const memory = `  page: ${await realm()}\n  worker: ${await realm(workerSession)}`;
          const newDocuments = read.distinct - previousDistinct;
          previousDistinct = read.distinct;
          const delta = [...now]
            .map(([key, count]) => [key, count - (previous.get(key) ?? 0)] as const)
            .filter(([, count]) => count > 0);
          previous = now;
          const total = delta.reduce((sum, [, count]) => sum + count, 0);
          // Grouped by the described stack, since two minified call sites can map to one source line.
          const grouped = new Map<string, number>();
          for (const [key, count] of delta) {
            const described = describe(key, Number(values.frames));
            grouped.set(described, (grouped.get(described) ?? 0) + count);
          }
          process.stdout.write(
            `\n${stage}: ${total} registry opens, ${newDocuments} documents never opened before (${read.distinct} so far)\n  counters ${JSON.stringify(counters)}\n${memory}\n`,
          );
          if (values.saves) {
            process.stdout.write(`  saves by kind so far: ${JSON.stringify(read.saves)}\n`);
          }
          if (values.syncs) {
            process.stdout.write(`  syncWithPeer calls so far: ${read.syncs}\n`);
          }
          if (read.sizes) {
            const order = (bucket: string) => (bucket === '<1K' ? 0 : Number(bucket.slice(1, -1)));
            const buckets = Object.entries(read.sizes.buckets)
              .sort(([left], [right]) => order(left) - order(right))
              .map(([bucket, count]) => `${bucket} ${count}`)
              .join(', ');
            process.stdout.write(
              `  range loads so far by size: ${buckets}; largest ${(read.sizes.max / 1048576).toFixed(1)} MiB\n`,
            );
          }
          for (const [stack, count] of [...grouped]
            .sort(([, left], [, right]) => right - left)
            .slice(0, Number(values.top))) {
            process.stdout.write(`  ${String(count).padStart(6)}  ${stack}\n`);
          }
        };

        await page.goto(`${origin}/`, { timeout: 120_000 });
        const timeout = setTimeout(() => breakpointSet.reject(new Error(`never attached to ${workerFile}`)), 60_000);
        await breakpointSet.promise.finally(() => clearTimeout(timeout));
        await waitForReady(page);
        await sample('ready');
        for (let elapsed = 30_000; elapsed <= Number(values['idle-ms']); elapsed += 30_000) {
          await sleep(30_000);
          await sample(`ready+${elapsed / 1000}s`);
        }
        if (values.retained) {
          await cdp.send('HeapProfiler.collectGarbage', {}, workerSession);
          const { profile } = await cdp.send('HeapProfiler.getSamplingProfile', {}, workerSession);
          const { totalBytes, byCaller, byFunction } = allocationReport(profile, {
            distDir: dist,
            top: Number(values.top),
          });
          process.stdout.write(
            `\nretained in the worker: ${Math.round(totalBytes / 1048576)} MiB sampled\n  by first-party caller\n`,
          );
          for (const { name, bytes } of byCaller) {
            process.stdout.write(`  ${(bytes / 1048576).toFixed(1).padStart(7)}  ${name}\n`);
          }
          process.stdout.write('  by allocating function\n');
          for (const { name, bytes } of byFunction) {
            process.stdout.write(`  ${(bytes / 1048576).toFixed(1).padStart(7)}  ${name}\n`);
          }
        }
        cdp.close();
      } finally {
        await context.close();
      }
    }
  } finally {
    rmSync(profileDir, { recursive: true, force: true });
    await preview.stop();
    await Promise.race([proxy.close(), sleep(5_000)]);
  }
  process.stdout.write(`\npartition: ${proxy.denied().length} refused, tunnelled to ${edgeHost ?? 'nothing'}\n`);
};

process.exit(await main().then(() => 0));
