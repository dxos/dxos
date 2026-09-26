//
// Copyright 2026 DXOS.org
//

// Memory and write latency in Chromium: one, two and three tabs holding a space as tab documents or
// as Automerge replicas, sharing one worker that holds the space in Automerge.
// Usage: node --conditions=source src/bench/browser/run.ts <corpus.json> [--tabs 1,2,3]

import * as A from '@automerge/automerge';
import { chromium } from '@playwright/test';
import { type BuildOptions, build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { saveNoCompress } from '../../save.ts';
import { type DocInput, type Latency, type Measure, median } from './common.ts';

const here = import.meta.dirname;
const out = join(here, '../../../dist/bench');
const require = createRequire(import.meta.url);

const corpus: { docs: { kind: string; bytes: string }[] } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const tabCounts = (process.argv.includes('--tabs') ? process.argv[process.argv.indexOf('--tabs') + 1] : '1,2,3')
  .split(',')
  .map(Number);

const docs = corpus.docs.map((entry) => A.load(Buffer.from(entry.bytes, 'base64')));
const replicaInput: DocInput[] = corpus.docs.map((entry) => ({ bytes: entry.bytes, hash: [], heads: [] }));
const tabInput: DocInput[] = docs.map((doc) => ({
  bytes: Buffer.from(saveNoCompress(doc)).toString('base64'),
  hash: A.getAllChanges(doc).map((change) => A.decodeChange(change).hash),
  heads: A.getHeads(doc),
}));
const textDoc = corpus.docs.findIndex((entry) => entry.kind === 'document');

const options: BuildOptions = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outdir: out,
  conditions: ['source'],
  logLevel: 'error',
};
await build({
  ...options,
  entryPoints: ['probe', 'tab-docs', 'replica', 'empty'].map((name) => join(here, `${name}.ts`)),
});
// The worker takes the base64 entry, which carries Automerge's wasm inline and instantiates it on import.
await build({
  ...options,
  entryPoints: [join(here, 'worker.ts')],
  alias: {
    '@automerge/automerge': join(require.resolve('@automerge/automerge'), '../../mjs/entrypoints/fullfat_base64.js'),
  },
});

const page = (script: string) =>
  `<!doctype html><html><body><script type="module" src="/${script}.js"></script></body></html>`;
const server = createServer((request, response) => {
  const name = (request.url ?? '/').slice(1);
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
  if (name.endsWith('.html')) {
    response.writeHead(200, { ...headers, 'Content-Type': 'text/html' }).end(page(name.replace('.html', '')));
  } else if (name === 'input-tab.json' || name === 'input-replica.json') {
    response
      .writeHead(200, { ...headers, 'Content-Type': 'application/json' })
      .end(JSON.stringify(name === 'input-tab.json' ? tabInput : replicaInput));
  } else if (name === 'automerge.wasm') {
    response
      .writeHead(200, { ...headers, 'Content-Type': 'application/wasm' })
      .end(readFileSync(join(require.resolve('@automerge/automerge'), '../../automerge.wasm')));
  } else if (name.endsWith('.js')) {
    response.writeHead(200, { ...headers, 'Content-Type': 'text/javascript' }).end(readFileSync(join(out, name)));
  } else {
    response.writeHead(404).end();
  }
});
await new Promise<void>((resolve) => server.listen(0, resolve));
const address = server.address();
const origin = `http://localhost:${typeof address === 'object' && address ? address.port : 0}`;

// The pre-installed Chromium, since the repo's Playwright expects a newer build than the one present.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
});
const mb = (bytes: number) => (bytes / 1048576).toFixed(1);

type Row = { mode: string; tabs: number; perTab: Measure[]; workerWasm: number };
const rows: Row[] = [];
const latencies: Record<string, Latency> = {};

for (const mode of ['empty', 'replica', 'tab-docs']) {
  for (const tabs of tabCounts) {
    const context = await browser.newContext();
    const pages = [];
    for (let index = 0; index < tabs; index++) {
      const tab = await context.newPage();
      tab.on('pageerror', (error) => console.error(mode, 'page error', error.message));
      await tab.goto(`${origin}/${mode}.html`);
      await tab.waitForFunction(() => typeof Reflect.get(globalThis, 'load') === 'function');
      if (index === 0 && mode !== 'empty') {
        await tab.evaluate(
          (bytes) => Reflect.get(globalThis, 'loadWorker')(bytes),
          corpus.docs.map((entry) => entry.bytes),
        );
      }
      await tab.evaluate(() => Reflect.get(globalThis, 'load')());
      pages.push(tab);
    }
    // Measure every tab once all are loaded.
    const perTab: Measure[] = [];
    for (const tab of pages) {
      perTab.push(
        await tab.evaluate(async () => {
          const collect: unknown = Reflect.get(globalThis, 'gc');
          for (let i = 0; i < 6; i++) {
            if (typeof collect === 'function') {
              Reflect.apply(collect, globalThis, []);
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          const memory: unknown = Reflect.get(performance, 'memory');
          const wasmBytes: unknown = Reflect.get(globalThis, '__wasmBytes');
          return {
            heap: typeof memory === 'object' && memory !== null ? Number(Reflect.get(memory, 'usedJSHeapSize')) : NaN,
            wasm: typeof wasmBytes === 'function' ? Number(Reflect.apply(wasmBytes, globalThis, [])) : 0,
            loadMs: 0,
          };
        }),
      );
    }
    const workerWasm =
      mode === 'empty'
        ? 0
        : Number((await pages[0].evaluate(() => Reflect.get(globalThis, 'workerMemory')())).wasm ?? 0);
    rows.push({ mode, tabs, perTab, workerWasm });
    if (tabs === tabCounts[0] && mode !== 'empty') {
      latencies[mode] = await pages[0].evaluate(
        ([doc, count]) => Reflect.get(globalThis, 'write')(doc, count),
        [textDoc, 200],
      );
    }
    if (mode !== 'empty') {
      const released: { freed: number; after: number } = await pages[0].evaluate(() =>
        Reflect.get(globalThis, 'release')(),
      );
      console.log(
        mode,
        tabs,
        'tab(s): the first tab frees',
        mb(released.freed),
        'MB when it drops its documents, leaving',
        mb(released.after),
        'MB',
      );
    }
    await context.close();
  }
}
await browser.close();
server.close();

// Chrome counts wasm linear memory in usedJSHeapSize, so a tab's total is its heap; wasm is shown as the part of it.
console.log('mode       tabs  per tab: heap, of which wasm (MB)       tabs total   worker wasm');
for (const row of rows) {
  const per = row.perTab.map((entry) => `${mb(entry.heap)} (${mb(entry.wasm)})`).join('  ');
  const total = row.perTab.reduce((sum, entry) => sum + entry.heap, 0);
  console.log(
    row.mode.padEnd(10),
    String(row.tabs).padEnd(5),
    per.padEnd(40),
    mb(total).padStart(8),
    mb(row.workerWasm).padStart(12),
  );
}
for (const [mode, latency] of Object.entries(latencies)) {
  console.log(
    mode.padEnd(10),
    'write: tab',
    median(latency.tabMs).toFixed(2),
    'ms, round trip',
    median(latency.roundTripMs).toFixed(2),
    'ms (p95',
    [...latency.roundTripMs]
      .sort((left, right) => left - right)
      [Math.floor(latency.roundTripMs.length * 0.95)].toFixed(2),
    '), worker',
    median(latency.workerMs).toFixed(2),
    'ms',
  );
}
