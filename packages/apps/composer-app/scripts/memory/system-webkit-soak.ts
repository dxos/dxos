//
// Copyright 2026 DXOS.org
//

/**
 * The memory-profile soak in the system's WebKit — the engine the native app embeds — rather than
 * Playwright's WebKit build, which differs in what it frees. A small WKWebView host (`--host`, built with
 * `swiftc -O scripts/memory/wkapp.swift -o ../../../.perf/wkapp`) loads the bundle behind the same
 * partition as `webkit-soak.ts`: every connection goes through the CONNECT proxy, which tunnels only to
 * the non-production EDGE in `--edge`.
 *
 * Usage: node scripts/memory/system-webkit-soak.ts --host <wkapp> --archive <file.dxprofile> --dist <bundle>
 *        --edge <non-production EDGE URL> [--telemetry <sink port>] [--port 4498] [--passes 8]
 *        [--idle-ms 60000] [--drive <calls per round>] [--drive-rounds 3] [--drive-via client]
 *        [--devtools] [--watch <readings>]
 *
 * `--drive` ends with rounds of that many calls to a loopback route answering EDGE's JSON envelope
 * (512 KiB, gzipped), each read after two forced collections. `--drive-via` names the path per round,
 * comma-separated to cycle in one process: `client` (the app's EDGE HTTP client), `fetch`, `fetch-init`
 * (`_call`'s request options), `fetch-url`, `fetch-tag`, `fetch-clone`; `probe` counts body and stream
 * calls per path instead.
 */

import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { isProductionEdgeHost, startPartitionProxy, startTelemetrySink } from '@dxos/perf-harness';

import { servePreview } from './preview.ts';

const APP_DIR = path.resolve(import.meta.dirname, '../..');
const WORKSPACE_ROOT = path.resolve(APP_DIR, '../../..');
const SETTLE_MS = 20_000;
const MAX_SPACES = 12;

const { values } = parseArgs({
  options: {
    'host': { type: 'string' },
    'archive': { type: 'string' },
    'dist': { type: 'string' },
    'edge': { type: 'string' },
    'telemetry': { type: 'string' },
    'port': { type: 'string', default: '4498' },
    'passes': { type: 'string', default: '8' },
    'idle-ms': { type: 'string', default: '60000' },
    'drive': { type: 'string', default: '0' },
    'drive-rounds': { type: 'string', default: '3' },
    'drive-via': { type: 'string', default: 'client' },
    'devtools': { type: 'boolean', default: false },
    'watch': { type: 'string', default: '0' },
  },
});
if (!values.host || !values.archive || !values.dist || !values.edge) {
  throw new Error('usage: system-webkit-soak.ts --host <wkapp> --archive <file> --dist <bundle> --edge <url>');
}
const edgeHost = URL.canParse(values.edge) ? new URL(values.edge).hostname : undefined;
if (!edgeHost || isProductionEdgeHost(edgeHost)) {
  throw new Error(`--edge must name a non-production EDGE URL, not "${values.edge}"`);
}
const dist = path.resolve(values.dist);
const bundleMentions = (text: string): boolean => {
  try {
    return execFileSync('grep', ['-rlF', text, path.join(dist, 'assets')], { encoding: 'utf8' }).trim() !== '';
  } catch {
    return false;
  }
};
if (!bundleMentions(values.edge)) {
  throw new Error(`${dist} is not an --edge ${values.edge} build`);
}
const telemetryPort = values.telemetry ? Number(values.telemetry) : undefined;
if (telemetryPort && !bundleMentions(`http://127.0.0.1:${telemetryPort}`)) {
  throw new Error(`${dist} is not a --telemetry build for port ${telemetryPort}`);
}
const port = Number(values.port);
const origin = `http://127.0.0.1:${port}`;
const passes = Number(values.passes);
const idleMs = Number(values['idle-ms']);
const driveCalls = Number(values.drive);
const driveRounds = Number(values['drive-rounds']);
const driveVia = values['drive-via'];

type Reply = { id: string; ok: boolean; value?: string; error?: string };

/** The WKWebView host: one JSON command per line in, one reply per line out. */
const startHost = (proxyPort: number, store: string) => {
  const proc = spawn(path.resolve(values.host!), [String(proxyPort), store, path.resolve(values.archive!)], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const waiting = new Map<string, (reply: Reply) => void>();
  createInterface({ input: proc.stdout }).on('line', (line) => {
    // wkapp writes only this shape.
    const reply = JSON.parse(line) as Reply;
    waiting.get(reply.id)?.(reply);
    waiting.delete(reply.id);
  });
  const ready = new Promise<Reply>((resolve) => waiting.set('ready', resolve));
  let next = 0;
  const send = (command: Record<string, string>): Promise<Reply> =>
    new Promise((resolve) => {
      const id = String(next++);
      waiting.set(id, resolve);
      proc.stdin.write(`${JSON.stringify({ id, ...command })}\n`);
    });
  const load = async (url: string) => {
    const reply = await send({ op: 'load', url });
    if (!reply.ok) {
      throw new Error(`load ${url}: ${reply.error}`);
    }
  };
  /** Runs `body` (an async function body) in the page and returns its JSON-able result. */
  const evaluate = async <T>(body: string): Promise<T> => {
    const reply = await send({ op: 'eval', js: `return JSON.stringify(await (async () => { ${body} })() ?? null);` });
    if (!reply.ok) {
      throw new Error(reply.error);
    }
    // The page body returns `T` as JSON text; nothing checks it crossing the host.
    return JSON.parse(reply.value ?? 'null') as T;
  };
  return { proc, ready, load, evaluate };
};

type ProcessFootprint = { pid: number; name: string; bytes: number; regions: Record<string, number> };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const footprintOf = (pid: number, scratch: string): ProcessFootprint | undefined => {
  const file = path.join(scratch, `footprint-${pid}.json`);
  try {
    execFileSync('footprint', ['-p', String(pid), '-j', file], { stdio: 'ignore' });
  } catch {
    return undefined;
  }
  const report: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const entry = isRecord(report) && Array.isArray(report.processes) ? report.processes[0] : undefined;
  if (!isRecord(entry) || typeof entry.footprint !== 'number') {
    return undefined;
  }
  const regions: Record<string, number> = {};
  if (isRecord(entry.categories)) {
    for (const [name, category] of Object.entries(entry.categories)) {
      if (isRecord(category) && typeof category.dirty === 'number' && category.dirty > 0) {
        regions[name] = category.dirty;
      }
    }
  }
  return { pid, name: typeof entry.name === 'string' ? entry.name : String(pid), bytes: entry.footprint, regions };
};

/** System WebKit's helper processes; the host's are the ones that appear after it starts. */
const webkitPids = (): Set<number> => {
  try {
    return new Set(
      execFileSync('pgrep', ['-f', 'com.apple.WebKit.(WebContent|Networking|GPU)'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(Number),
    );
  } catch {
    return new Set();
  }
};

const offMachineSockets = (pids: number[]): string[] => {
  let output = '';
  try {
    output = execFileSync('lsof', ['-nP', '-a', '-i', '-p', pids.join(',')], { encoding: 'utf8' });
  } catch {
    return [];
  }
  return output
    .split('\n')
    .slice(1)
    .filter((line) => {
      const remote = /->([^\s]+)/.exec(line)?.[1];
      return remote !== undefined && !/^(127\.0\.0\.1|\[::1\]|localhost):/.test(remote);
    });
};

const collect = async () => {
  execFileSync('notifyutil', ['-p', 'org.WebKit.lowMemory']);
  await sleep(5_000);
};

const mib = (bytes: number) => Math.round(bytes / 1048576);

/** EDGE's success envelope around generated rows, as a busy API route answers. */
const startEnvelopeServer = async (port: number, allowOrigin: string) => {
  const rows = Array.from({ length: 4_000 }, (_, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2)}`,
    value: Math.random(),
    label: Math.random().toString(36).repeat(3),
  }));
  const body = gzipSync(JSON.stringify({ success: true, data: { rows } }));
  const server = createServer((request, response) => {
    response.setHeader('access-control-allow-origin', allowOrigin);
    response.setHeader('access-control-allow-headers', request.headers['access-control-request-headers'] ?? '*');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    response.writeHead(200, {
      'content-type': 'application/json',
      'content-encoding': 'gzip',
      'cache-control': 'no-store',
    });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${port}/envelope`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

const main = async (): Promise<number> => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const outDir = path.join(WORKSPACE_ROOT, '.perf', 'system-webkit-soak', stamp);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const scratch = mkdtempSync(path.join(tmpdir(), 'dx-syswk-footprint-'));
  const store = randomUUID();

  const preview = await servePreview(dist, port);
  const proxy = await startPartitionProxy({ allow: [edgeHost] });
  const sink = telemetryPort
    ? await startTelemetrySink({
        port: telemetryPort,
        posthogAssets: path.join(
          path.dirname(
            createRequire(path.join(WORKSPACE_ROOT, 'packages/sdk/observability/package.json')).resolve(
              'posthog-js/package.json',
            ),
          ),
          'dist',
        ),
      })
    : undefined;
  const envelope = driveCalls > 0 ? await startEnvelopeServer(port + 1, origin) : undefined;
  const readings: unknown[] = [];
  const before = webkitPids();
  let host = startHost(proxy.port, store);
  try {
    await host.ready;

    // Other apps on the machine (the installed native app among them) spawn WebKit processes too.
    const foreign = (pid: number) => {
      try {
        const asn = execFileSync('lsappinfo', ['find', `pid=${pid}`], { encoding: 'utf8' }).trim();
        return (
          asn !== '' &&
          !/wkapp/.test(execFileSync('lsappinfo', ['info', '-only', 'displayname', asn], { encoding: 'utf8' }))
        );
      } catch {
        return false;
      }
    };
    const ours = () => [...webkitPids()].filter((pid) => !before.has(pid) && !foreign(pid));
    const content = (processes: ProcessFootprint[]) => processes.find(({ name }) => name.includes('WebContent'));
    const stage = async (id: string, body: () => Promise<unknown>) => {
      const started = Date.now();
      const result = await body();
      const pids = ours();
      const processes = pids.map((pid) => footprintOf(pid, scratch)).filter((reading) => reading !== undefined);
      const dom = await host.evaluate<number>(`return document.getElementsByTagName('*').length;`).catch(() => -1);
      const sockets = offMachineSockets(pids);
      readings.push({
        stage: id,
        wallMs: Date.now() - started,
        processes,
        dom,
        result,
        offMachineSockets: sockets.length,
      });
      const page = content(processes);
      process.stdout.write(
        `${id.padEnd(14)} ${String(Math.round((Date.now() - started) / 1000)).padStart(4)} s  content ${String(mib(page?.bytes ?? 0)).padStart(5)} MiB` +
          `  gigacage ${String(mib(page?.regions['JS VM Gigacage'] ?? 0)).padStart(5)}  malloc ${String(mib(page?.regions['WebKit malloc'] ?? 0)).padStart(5)}` +
          `  elements ${dom}${result === undefined ? '' : `  ${JSON.stringify(result)}`}\n`,
      );
      if (sockets.length > 0) {
        throw new Error(`sockets off the machine after ${id}: ${sockets.length}`);
      }
    };
    const waitForReady = async () => {
      for (let attempt = 0; attempt < 240; attempt++) {
        if (
          await host
            .evaluate<boolean>(`return !!document.querySelector('[data-testid="treeView.userAccount"]');`)
            .catch(() => false)
        ) {
          return;
        }
        await sleep(500);
      }
      throw new Error('the app never became ready');
    };

    await host.load(`${origin}/recovery.html`);
    for (let attempt = 0; attempt < 120; attempt++) {
      if (await host.evaluate<boolean>(`return !!globalThis.dxos?.recovery?.importSqlite;`).catch(() => false)) {
        break;
      }
      await sleep(500);
    }
    // The host answers the file picker with the archive.
    await host.evaluate(`await globalThis.dxos.recovery.importSqlite(); return true;`);
    // The importing page holds the whole archive and can outlive the navigation away from it, so the
    // app boots in a fresh host on the same store, as the native app starts.
    host.proc.kill();
    await new Promise((resolve) => host.proc.once('exit', resolve));
    await sleep(3_000);
    host = startHost(proxy.port, store);
    await host.ready;

    await stage('boot', async () => {
      await host.load(`${origin}/`);
      await waitForReady();
    });
    await sleep(SETTLE_MS);
    if (values.devtools) {
      // As a developer's native app keeps it: the devtools plugin on, its overview expanded in the
      // complementary sidebar, where its cards poll EDGE. Enabled plugins load on the next boot.
      await host.evaluate(`
        const ids = (globalThis.composer?.plugins?.() ?? []).filter(({ id }) => id === 'org.dxos.plugin.devtools').map(({ id }) => id);
        await globalThis.composer.invoke('org.dxos.operation.registry.enablePlugins', { ids });
        return true;
      `);
      await sleep(3_000);
      await host.load(`${origin}/`);
      await waitForReady();
      await host.evaluate(
        `await globalThis.composer.invoke('org.dxos.operation.appToolkit.updateComplementary', { subject: 'devtoolsOverview', state: 'expanded' }); return true;`,
      );
      let mounted = false;
      for (let attempt = 0; attempt < 60 && !mounted; attempt++) {
        mounted = await host.evaluate<boolean>(`return document.body.innerText.includes('Websocket');`);
        await sleep(500);
      }
      process.stdout.write(`devtools overview mounted: ${mounted}\n`);
    }
    await stage('idle', () => sleep(idleMs));
    // Readings after two collections each, so what stays is retained, not yet uncollected.
    for (let round = 1; round <= Number(values.watch); round++) {
      await sleep(idleMs);
      await collect();
      await sleep(5_000);
      await collect();
      await stage(`watch-${round}`, async () => undefined);
    }
    const spaceIds = await host.evaluate<string[]>(
      `return (globalThis.dxos?.spaces?.() ?? []).slice(0, ${MAX_SPACES}).map(({ id }) => id);`,
    );
    for (let pass = 1; pass <= passes; pass++) {
      await stage(`visit-${pass}`, async () => {
        for (const spaceId of spaceIds) {
          await host.evaluate(
            `await globalThis.composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: 'root/${spaceId}' }); return true;`,
          );
          for (let attempt = 0; attempt < 120; attempt++) {
            if (await host.evaluate<boolean>(`return location.pathname.includes('/w/${spaceId}');`)) {
              break;
            }
            await sleep(250);
          }
          await waitForReady();
          await sleep(3_000);
        }
      });
      await stage(`idle-${pass}`, () => sleep(idleMs));
    }

    if (driveVia === 'probe' && envelope) {
      // Which body and stream methods each path calls, counted per path; no values are recorded.
      const counts = await host.evaluate(`
        const counters = {};
        const wrap = (proto, name, label) => {
          const original = proto[name];
          proto[name] = function (...args) {
            counters[label] = (counters[label] ?? 0) + 1;
            return original.apply(this, args);
          };
        };
        wrap(Response.prototype, 'clone', 'Response.clone');
        const cloneStacks = [];
        const cloneOriginal = Response.prototype.clone;
        Response.prototype.clone = function () {
          if (cloneStacks.length < 2) cloneStacks.push(String(new Error().stack).split('\\n').slice(0, 12).map((line) => line.replace(/https?:\\/\\/[^/]+/, '')));
          return cloneOriginal.call(this);
        };
        wrap(Response.prototype, 'json', 'Response.json');
        wrap(Response.prototype, 'text', 'Response.text');
        wrap(Response.prototype, 'arrayBuffer', 'Response.arrayBuffer');
        wrap(Response.prototype, 'blob', 'Response.blob');
        wrap(ReadableStream.prototype, 'getReader', 'ReadableStream.getReader');
        wrap(ReadableStream.prototype, 'tee', 'ReadableStream.tee');
        wrap(ReadableStream.prototype, 'pipeTo', 'ReadableStream.pipeTo');
        wrap(TextDecoder.prototype, 'decode', 'TextDecoder.decode');
        const originalFetch = globalThis.fetch;
        globalThis.fetch = function (...args) {
          counters.fetch = (counters.fetch ?? 0) + 1;
          return originalFetch.apply(this, args);
        };
        const http = globalThis.__DXOS__.client.edge.http;
        const ctx = { getAttribute: () => undefined, disposed: false };
        const snapshot = () => { const copy = { ...counters }; for (const key of Object.keys(counters)) delete counters[key]; return copy; };
        for (let i = 0; i < 10; i++) await (await fetch('${envelope.url}', { method: 'GET', headers: { 'Content-Type': 'application/json' } })).json();
        const viaFetch = snapshot();
        for (let i = 0; i < 10; i++) await http.request(ctx, '${envelope.url}', { method: 'GET', auth: false });
        const viaClient = snapshot();
        globalThis.fetch = originalFetch;
        return { viaFetch, viaClient, cloneStacks };
      `);
      process.stdout.write(`probe ${JSON.stringify(counts)}\n`);
    }

    // Rounds, each read after two collections: a leak grows by the round's volume every round, where a
    // collection that has not caught up plateaus.
    if (driveCalls > 0) {
      await collect();
      await stage('pre-drive', async () => undefined);
    }
    for (let round = 1; driveCalls > 0 && round <= driveRounds; round++) {
      // A comma-separated list cycles through paths in one process, so heap state cannot explain a difference.
      const cycle = driveVia.split(',');
      const via = cycle[(round - 1) % cycle.length];
      await stage(`drive-${round}-${via}`, () =>
        host.evaluate(`
          const http = globalThis.__DXOS__?.client?.edge?.http;
          if (!http) throw new Error('no EDGE client on __DXOS__');
          const ctx = { getAttribute: () => undefined, disposed: false };
          let bytes = 0;
          let failures = 0;
          for (let i = 0; i < ${driveCalls}; i++) {
            try {
              // An absolute URL replaces the client's EDGE base, so the real _call path reads a loopback route.
              const result = '${via}' === 'fetch'
                ? await (await fetch('${envelope!.url}')).json()
                : '${via}' === 'fetch-url'
                  ? await (await fetch(new URL('${envelope!.url}'), { method: 'GET', body: undefined, headers: { 'Content-Type': 'application/json' } })).json()
                : '${via}' === 'fetch-tag'
                  ? await (await fetch('${envelope!.url}', { method: 'GET', body: undefined, headers: { 'Content-Type': 'application/json', [http._clientTag ? 'x-dxos-client-tag' : 'x-none']: String(http._clientTag) } })).json()
                : '${via}' === 'fetch-init'
                  ? await (await fetch('${envelope!.url}', { method: 'GET', body: undefined, headers: { 'Content-Type': 'application/json' } })).json()
                : '${via}' === 'fetch-clone'
                  ? await (await fetch('${envelope!.url}')).clone().json()
                  : await http.request(ctx, '${envelope!.url}', { method: 'GET', auth: false });
              bytes += JSON.stringify(result).length;
            } catch {
              failures++;
            }
          }
          return { calls: ${driveCalls}, mib: Math.round(bytes / 1048576), failures, nativeFetch: /\\[native code\\]/.test(String(fetch)), nativeJson: /\\[native code\\]/.test(String(Response.prototype.json)) };
        `),
      );
      await collect();
      await sleep(25_000);
      await collect();
      await stage(`after-${round}`, async () => undefined);
    }
  } finally {
    writeFileSync(
      path.join(outDir, 'report.json'),
      JSON.stringify(
        {
          engine: 'system-webkit',
          readings,
          partition: { denied: proxy.denied(), tunnelled: proxy.tunnelled() },
          ...(sink ? { telemetry: sink.traffic() } : {}),
        },
        null,
        2,
      ),
    );
    host.proc.kill();
    await sleep(2_000);
    // The imported profile lives in the host's data store; nothing of it may outlive the run. The
    // removal's completion handler does not always fire, so the directory is what is checked.
    const storeDir = path.join(
      homedir(),
      'Library/WebKit',
      path.basename(values.host!),
      'WebsiteDataStore',
      store.toUpperCase(),
    );
    try {
      execFileSync(path.resolve(values.host!), ['--remove', store], { stdio: 'ignore', timeout: 20_000 });
    } catch {
      // Checked below.
    }
    rmSync(storeDir, { recursive: true, force: true });
    if (existsSync(storeDir)) {
      process.stderr.write(`data store still on disk: ${storeDir}\n`);
    }
    await preview.stop();
    // A close waiting on a connection WebKit left open would keep the run alive with its output unflushed.
    const bounded = (close: Promise<void> | undefined) => Promise.race([close, sleep(5_000)]);
    await bounded(envelope?.close());
    await bounded(proxy.close());
    await bounded(sink?.close());
    rmSync(scratch, { recursive: true, force: true });
  }

  process.stdout.write(`report: ${path.relative(WORKSPACE_ROOT, outDir)}/report.json\n`);
  process.stdout.write(
    `partition: ${proxy.denied().length} refused, tunnelled to ${[...new Set(proxy.tunnelled().map(({ host }) => host))].join(', ') || 'nothing'}\n`,
  );
  if (sink) {
    const traffic = Object.entries(sink.traffic()).sort(([, left], [, right]) => right.bytes - left.bytes);
    process.stdout.write(
      `telemetry sent: ${traffic.map(([endpoint, { requests, bytes }]) => `${endpoint} ${requests}x ${mib(bytes)} MiB`).join(', ')}\n`,
    );
  }
  return 0;
};

process.exit(await main());
