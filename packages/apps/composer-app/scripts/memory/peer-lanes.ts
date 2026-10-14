//
// Copyright 2026 DXOS.org
//

/**
 * How deep Subduction's sync gates run in the ECHO worker over a soak, with a profile loaded behind
 * the partition: calls in flight and parked per gate site, peer-sync requests and how fast they were
 * answered, WebSocket bytes, and whether the worker's SQLite connection still answers. Non-pausing
 * conditional breakpoints record counts only, so it runs on a real profile.
 *
 * Usage: node scripts/memory/peer-lanes.ts --archive <file.dxprofile> --dist <bundle> --edge <URL>
 *        [--port 4510] [--debug-port 9342] [--passes 6] [--idle-ms 60000] [--trace]
 *   --trace      Subduction's own tracing at debug level, counted by message with every field masked.
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { type Attached, attachAll, detachAll, partitionArgs, startPartitionProxy } from '@dxos/perf-harness';

import { invokeInPage, waitForReady } from '../../src/playwright/perf/page.ts';
import { importProfileArchive } from '../../src/playwright/scenarios/memory-soak.ts';
import { servePreview } from './preview.ts';

const { values } = parseArgs({
  options: {
    'archive': { type: 'string' },
    'dist': { type: 'string' },
    'edge': { type: 'string' },
    'port': { type: 'string', default: '4510' },
    'debug-port': { type: 'string', default: '9342' },
    'passes': { type: 'string', default: '6' },
    'idle-ms': { type: 'string', default: '60000' },
    'trace': { type: 'boolean', default: false },
  },
});
if (!values.archive || !values.dist || !values.edge) {
  throw new Error('usage: peer-lanes.ts --archive <file> --dist <bundle> --edge <url>');
}
const edgeHost = new URL(values.edge).hostname;
if (edgeHost === 'dxos.network') {
  throw new Error('--edge must name a non-production EDGE');
}
const archive = path.resolve(values.archive);
const dist = path.resolve(values.dist);
try {
  execFileSync('grep', ['-rlF', values.edge, path.join(dist, 'assets')]);
} catch {
  throw new Error(`${dist} is not an --edge ${values.edge} build`);
}
const origin = `http://127.0.0.1:${values.port}`;

// The worker that runs Subduction: the dedicated-worker chunk holding its semaphore.
const workerFile = readdirSync(path.join(dist, 'assets')).find(
  (name) =>
    /^dedicated-worker-.*\.js$/.test(name) &&
    readFileSync(path.join(dist, 'assets', name), 'utf8').includes('semaphore: concurrency must be a positive integer'),
);
if (!workerFile) {
  throw new Error(`${dist} has no dedicated worker chunk running Subduction`);
}
const source = readFileSync(path.join(dist, 'assets', workerFile), 'utf8');

/** A breakpoint at `regex`'s `group`-th capture, as CDP's zero-based line and column. */
const locate = (regex: RegExp, group: number): { match: RegExpExecArray; lineNumber: number; columnNumber: number } => {
  const match = regex.exec(source);
  if (!match) {
    throw new Error(`${workerFile}: no match for ${regex}`);
  }
  const offset = match.index + match[0].indexOf(match[group]);
  const before = source.slice(0, offset);
  const lineNumber = before.split('\n').length - 1;
  return { match, lineNumber, columnNumber: offset - (before.lastIndexOf('\n') + 1) };
};

// The semaphore's gate: `async fn => { if (active < concurrency) active++; else { park } ... }`.
const gate = locate(
  /return async (\w+)=>\{(if\((\w+)<(\w+)\)\3\+\+;else\{let\{promise:\w+,resolve:\w+\}=Promise\.withResolvers\(\);(\w+)\.push)/,
  2,
);
const [, , , active, cap, waiters] = gate.match;
// `#requestPeerSync(entry, subduction, peerId, timeoutMs)`, and its call into the peer.
const request = locate(/#\w+\((\w+),(\w+),(\w+),(\w+)\)\{(let \w+=\3\.toString\(\),\w+=\1\.waitingPeerSyncs\.get)/, 5);
const syncCall = locate(/((\w+)\.syncWithPeer\((\w+),\w+\.sedimentreeId,!0,(\w+)\))/, 1);
const [, , subduction, , timeout] = syncCall.match;
// The gate's release: `() => { const next = waiters.shift(); next ? next() : active--; }`.
const release = locate(new RegExp(`(let \\w+=${waiters}\\.shift\\(\\);\\w+\\?\\w+\\(\\):${active}--)`), 1);

const GATE_CONDITION = `((L, w, a, c, s) => {
  let x = L.map.get(w);
  if (!x) { x = { calls: 0, cap: c, site: s }; L.map.set(w, x); L.refs.push(new WeakRef(w)); }
  x.calls++; x.active = a; x.waiting = w.length;
})(globalThis.__dxLanes ??= { map: new WeakMap(), refs: [] }, ${waiters}, ${active}, ${cap},
  (new Error().stack ?? '').split('\\n').slice(2, 4).map((line) => line.replace(/^.*?:(\\d+:\\d+)\\)?$/, '$1')).join(' < ')), false`;
const REQUEST_CONDITION = `(globalThis.__dxRequests = (globalThis.__dxRequests ?? 0) + 1), false`;
// Wraps the peer call once, to bucket each answer by latency and outcome.
const SYNC_CONDITION = `(globalThis.__dxSyncs = (globalThis.__dxSyncs ?? 0) + 1, globalThis.__dxTimeout = ${timeout},
  ${subduction}.__dxTimed || ((s) => {
    const call = s.syncWithPeer.bind(s);
    const answers = (globalThis.__dxAnswers = {});
    const bucket = (ms) => ms < 1000 ? '<1s' : ms < 5000 ? '<5s' : ms < 30000 ? '<30s' : ms < 59000 ? '<59s' : '>=59s';
    const count = (key) => { answers[key] = (answers[key] ?? 0) + 1; };
    s.syncWithPeer = (...args) => {
      const start = performance.now();
      const answer = call(...args);
      answer.then(
        (result) => count(bucket(performance.now() - start) + ' ' + (result?.success ? 'ok' : (result?.transportErrors?.length ?? 0) > 0 ? 'transport-error' : 'failed') + ((result?.stats?.commitsReceived ?? 0) + (result?.stats?.fragmentsReceived ?? 0) > 0 ? ' data' : '')),
        () => count(bucket(performance.now() - start) + ' threw'),
      );
      return answer;
    };
    s.__dxTimed = true;
  })(${subduction})), false`;
const RELEASE_CONDITION = `((x) => { if (x) x.releases = (x.releases ?? 0) + 1; })(globalThis.__dxLanes?.map.get(${waiters})), false`;

const SAMPLE = `JSON.stringify((() => {
  const L = globalThis.__dxLanes;
  const sites = {};
  for (const ref of L?.refs ?? []) {
    const w = ref.deref();
    const x = w && L.map.get(w);
    if (!x) continue;
    const s = (sites[x.site] ??= { gates: 0, cap: x.cap, active: 0, waiting: 0, maxWaiting: 0, calls: 0, releases: 0 });
    s.gates++; s.active += x.active; s.waiting += x.waiting; s.maxWaiting = Math.max(s.maxWaiting, x.waiting); s.calls += x.calls; s.releases += x.releases ?? 0;
  }
  return { requests: globalThis.__dxRequests ?? 0, syncs: globalThis.__dxSyncs ?? 0, timeoutMs: globalThis.__dxTimeout, answers: globalThis.__dxAnswers, sites };
})())`;

const main = async () => {
  const preview = await servePreview(dist, Number(values.port));
  const proxy = await startPartitionProxy({ allow: [edgeHost] });
  const profileDir = mkdtempSync(path.join(tmpdir(), 'dx-peer-lanes-'));
  let attached: Attached[] = [];
  try {
    // Imported in a browser of its own, so the measured one boots on the profile as an installed app does.
    const importing = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: partitionArgs(proxy.port),
    });
    try {
      await importProfileArchive(importing.pages()[0] ?? (await importing.newPage()), origin, archive);
    } finally {
      await importing.close();
    }

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: [...partitionArgs(proxy.port), `--remote-debugging-port=${values['debug-port']}`],
    });
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      // Each message with its fields, ids and numbers masked, so lines count by what step logged them.
      const traces = new Map<string, number>();
      if (values.trace) {
        page.on('worker', (worker) => {
          void worker.evaluate(() => Reflect.set(globalThis, '__SUBDUCTION_DEBUG', true)).catch(() => {});
        });
        page.on('console', (message) => {
          // Subduction's tracing only: the app's own lines can carry content.
          if (!/subduction|sedimentree|sync|fingerprint|multiplexer|connection/i.test(message.text().slice(0, 200))) {
            return;
          }
          const template = message
            .text()
            .replace(/\b[\w.]+=("[^"]*"|\S+)/g, '')
            .replace(/[0-9a-f]{8,}|\b[A-Z2-7]{20,}\b|did:\S+/gi, '#')
            .replace(/\d+/g, 'N')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
          traces.set(template, (traces.get(template) ?? 0) + 1);
        });
      }
      await page.goto(`${origin}/`, { timeout: 120_000 });
      await waitForReady(page);

      attached = await attachAll(Number(values['debug-port']));
      const worker = attached.find(({ name }) => name.includes(workerFile));
      if (!worker) {
        throw new Error(`no dedicated worker among ${attached.map(({ name }) => name).join(', ')}`);
      }
      await worker.cdp.send('Debugger.enable', {});
      const urlRegex = workerFile.replace(/[.]/g, '\\.');
      for (const [location, condition] of [
        [gate, GATE_CONDITION],
        [request, REQUEST_CONDITION],
        [syncCall, SYNC_CONDITION],
        [release, RELEASE_CONDITION],
      ] as const) {
        const { locations } = await worker.cdp.send('Debugger.setBreakpointByUrl', {
          urlRegex,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
          condition,
        });
        if (locations.length === 0) {
          throw new Error(`breakpoint at ${location.lineNumber}:${location.columnNumber} did not resolve`);
        }
      }

      // WebSocket traffic per sample, by size only: whether stuck calls are uploading or idle.
      const frames = { sent: 0, sentKiB: 0, received: 0, receivedKiB: 0 };
      for (const target of attached) {
        target.cdp.on('Network.webSocketFrameSent', ({ response }) => {
          frames.sent++;
          frames.sentKiB += ((response.payloadData?.length ?? 0) * 0.75) / 1024;
        });
        target.cdp.on('Network.webSocketFrameReceived', ({ response }) => {
          frames.received++;
          frames.receivedKiB += ((response.payloadData?.length ?? 0) * 0.75) / 1024;
        });
        await target.cdp.trySend('Network.enable', {});
      }

      const sample = async (stage: string) => {
        const { result } = await worker.cdp.send('Runtime.evaluate', { expression: SAMPLE, returnByValue: true });
        const { usedSize } = await worker.cdp.send('Runtime.getHeapUsage', {});
        // Whether the worker's SQLite connection still answers: `select 1`, capped at 10 s.
        const sqlMs = await page.evaluate(async () => {
          const start = performance.now();
          const query = Promise.resolve(
            globalThis.dxos?.client?.services?.services?.DevtoolsHost?.runSqliteQuery?.({
              query: 'select 1',
            }),
          ).then(
            () => Math.round(performance.now() - start),
            () => -1,
          );
          return Promise.race([query, new Promise<number>((resolve) => setTimeout(() => resolve(-2), 10_000))]);
        });
        const health = `sql ${sqlMs === -2 ? 'timeout' : sqlMs === -1 ? 'error' : `${sqlMs} ms`}\tws sent ${frames.sent}/${Math.round(frames.sentKiB)} KiB recv ${frames.received}/${Math.round(frames.receivedKiB)} KiB`;
        Object.assign(frames, { sent: 0, sentKiB: 0, received: 0, receivedKiB: 0 });
        process.stdout.write(`${stage}\t${(usedSize / 1048576).toFixed(1)} MiB\t${health}\t${result.value}\n`);
        for (const [template, count] of [...traces].sort(([, left], [, right]) => right - left).slice(0, 40)) {
          process.stdout.write(`  trace\t${count}\t${template}\n`);
        }
        traces.clear();
      };

      const idleMs = Number(values['idle-ms']);
      await sample('ready');
      await sleep(idleMs);
      await sample('idle');
      const spaceIds = await page.evaluate(() => (globalThis.dxos?.spaces?.() ?? []).slice(0, 12).map(({ id }) => id));
      for (let pass = 1; pass <= Number(values.passes); pass++) {
        for (const spaceId of spaceIds) {
          await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
          await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: 60_000 });
          await waitForReady(page);
          await page.waitForTimeout(3_000);
        }
        await sample(`visit-${pass}`);
        await sleep(idleMs);
        await sample(`idle-${pass}`);
      }
    } finally {
      detachAll(attached);
      await context.close();
    }
  } finally {
    rmSync(profileDir, { recursive: true, force: true });
    await preview.stop();
    // A close waiting on a tunnel the browser left open would keep the run alive.
    await Promise.race([proxy.close(), sleep(5_000)]);
  }
  process.stdout.write(`partition: ${proxy.denied().length} refused\n`);
};

process.exit(await main().then(() => 0));
