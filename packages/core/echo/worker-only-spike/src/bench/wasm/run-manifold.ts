//
// Copyright 2026 DXOS.org
//

// Plugin wasm in a worker, shown with manifold (Spacetime's CSG): the same job run in the page and run
// in a worker the page terminates afterwards. The page's heap figure includes its wasm memory.
// Usage: node --conditions=source src/bench/wasm/run-manifold.ts

import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const here = import.meta.dirname;
const out = join(here, '../../../dist/bench-wasm');
const require = createRequire(import.meta.url);
const manifoldWasm = join(require.resolve('manifold-3d/manifold.wasm'));

await build({
  entryPoints: [join(here, 'manifold-page.ts'), join(here, 'manifold-in-worker.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outdir: out,
  logLevel: 'error',
  // Emscripten's loader names Node modules it only uses outside the browser.
  external: [
    'module',
    'fs',
    'path',
    'url',
    'worker_threads',
    'node:module',
    'node:fs',
    'node:path',
    'node:url',
    'node:worker_threads',
  ],
});

const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
const server = createServer((request, response) => {
  const name = (request.url ?? '/').slice(1);
  if (name === 'index.html') {
    response
      .writeHead(200, { ...headers, 'Content-Type': 'text/html' })
      .end('<!doctype html><script type="module" src="/manifold-page.js"></script>');
  } else if (name === 'manifold.wasm') {
    response.writeHead(200, { ...headers, 'Content-Type': 'application/wasm' }).end(readFileSync(manifoldWasm));
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
  args: ['--js-flags=--expose-gc', '--enable-precise-memory-info', '--enable-blink-features=ForceEagerMeasureMemory'],
});
const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
const job = { count: 60, segments: 96 };
for (const mode of ['inPage', 'viaWorker']) {
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', (error) => console.error(mode, error.message));
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction((name) => typeof Reflect.get(globalThis, name) === 'function', mode);
  const result: Record<string, number> = await page.evaluate(([name, input]) => Reflect.get(globalThis, name)(input), [
    mode,
    job,
  ] as const);
  console.log(
    mode.padEnd(10),
    `${result.triangles} triangles; page heap before ${mb(result.before)} MB, holding the result ${mb(result.during)} MB, after ${mb(result.after)} MB`,
    result.totalRunning !== undefined
      ? `; page and workers ${mb(result.totalRunning)} MB running, ${mb(result.total)} MB released`
      : `; page and workers ${mb(result.total)} MB`,
  );
}
await browser.close();
server.close();
