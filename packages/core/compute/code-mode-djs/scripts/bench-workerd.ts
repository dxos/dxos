//
// Copyright 2026 DXOS.org
//

import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * djs against Cloudflare's worker loader, both inside workerd (Miniflare), on the same SDK payload —
 * effect, `@dxos/echo` and `@dxos/compute`, bundled once — and the same programs.
 *
 * - loader: `env.LOADER.get(id, …)` makes an isolate whose modules are the SDK and the program, the
 *   way `WorkerdSandbox` loads one per evaluation; a fixed id reuses a warm isolate.
 * - djs: the SDK is run once into a base image; a session is a copy of it; a program runs in a
 *   session that already exists.
 *
 * workerd freezes its clocks while JavaScript runs, so every time here is measured from Node, around
 * one request to the Worker: medians, with a no-op request's median shown for the transport.
 *
 * Run: `node --conditions=source scripts/bench-workerd.ts [rounds]`.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rounds = Number(process.argv[2] ?? 15);

/** The library payload both runtimes load: the SDK on `globalThis.__sdk`, with the guest's polyfills first. */
const SDK_ENTRY = `
import './src/guest/polyfills.ts';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
globalThis.__sdk = { Effect, Schema, Operation, Database, Filter, Obj, Query, Ref, Type, DXN };
`;

/** Program bodies, each an async function body returning a value. */
const PROGRAMS: Record<string, string> = {
  trivial: 'return 1;',
  cpu: 'let sum = 0; for (let i = 0; i < 1e6; i++) { sum += i % 7; } return sum;',
  effect: `const { Effect } = globalThis.__sdk;
    return Effect.runSync(Effect.forEach(Array.from({ length: 1000 }, (_, i) => i), (i) => Effect.succeed(i * 2))).length;`,
  echo: `const { Obj, Type, Schema, DXN } = globalThis.__sdk;
    globalThis.__Task ??= Type.makeObject(DXN.make('com.example.type.task', '0.1.0'))(Schema.Struct({ title: Schema.String }));
    let size = 0;
    for (let i = 0; i < 100; i++) {
      const task = Obj.make(globalThis.__Task, { title: 'task ' + i });
      Obj.update(task, (task) => { task.title = task.title + '!'; });
      size += JSON.stringify(Obj.toJSON(task)).length;
    }
    return size;`,
};

const WORKER = `
import { Sandbox } from '@earendil-works/djs';
import DJS from './djs.wasm';
import SDK from './sdk.txt';

const PROGRAMS = ${JSON.stringify(PROGRAMS)};
const OPTIONS = { module: DJS, asyncFunctions: { 'dx.sleep': (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } };
let base;
let session;
let fresh = 0;

const loaderModule = (sdk, program) =>
  (sdk ? "import './sdk.js';\\n" : '') +
  'export default { async fetch() { const value = await (async () => {' + program + '})(); return Response.json({ value }); } };';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, kind, name] = url.pathname.split('/');
    const sdk = url.searchParams.get('sdk') === '1';
    switch (kind) {
      case 'noop':
        return Response.json({ value: 0 });
      case 'loader': {
        const id = url.searchParams.get('warm') === '1' ? 'warm-' + sdk : 'fresh-' + fresh++;
        const isolate = env.LOADER.get(id, async () => ({
          compatibilityDate: '2025-10-01',
          mainModule: 'main.js',
          modules: { 'main.js': loaderModule(sdk, PROGRAMS[name]), ...(sdk ? { 'sdk.js': SDK } : {}) },
          globalOutbound: null,
        }));
        return isolate.getEntrypoint().fetch('http://sandbox/');
      }
      case 'djs-base': {
        const sandbox = new Sandbox(OPTIONS);
        sandbox.run(SDK);
        base = sandbox.image();
        sandbox.dispose();
        return Response.json({ value: base.image.byteLength });
      }
      case 'djs-open': {
        session?.dispose();
        session = await Sandbox.fromImage(base, OPTIONS);
        return Response.json({ value: session.heapSize });
      }
      case 'djs-cold': {
        const once = await Sandbox.fromImage(base, OPTIONS);
        const value = await once.runAsync(PROGRAMS[name]);
        once.dispose();
        return Response.json({ value });
      }
      case 'djs-run':
        return Response.json({ value: await session.runAsync(PROGRAMS[name]) });
    }
    return new Response('unknown', { status: 404 });
  },
};
`;

const bundle = async (contents: string, options: { format: 'iife' | 'esm'; external?: string[] }): Promise<string> => {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: 'ts' },
    bundle: true,
    write: false,
    format: options.format,
    platform: 'browser',
    conditions: ['source', 'browser'],
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    external: options.external,
    alias: {
      'node:util': join(root, 'src', 'guest', 'shims', 'util.ts'),
      'node:crypto': join(root, 'src', 'guest', 'shims', 'crypto.ts'),
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'error',
  });
  return result.outputFiles[0].text;
};

const median = (values: readonly number[]): number =>
  [...values].sort((left, right) => left - right)[values.length >> 1];

const main = async () => {
  const sdk = await bundle(SDK_ENTRY, { format: 'iife' });
  const worker = await bundle(WORKER, { format: 'esm', external: ['./djs.wasm', './sdk.txt'] });
  const djsWasm = await readFile(
    join(dirname(createRequire(import.meta.url).resolve('@earendil-works/djs')), '..', 'wasm', 'djs.wasm'),
  );

  const miniflare = new Miniflare({
    modulesRoot: root,
    modules: [
      { type: 'ESModule', path: join(root, 'worker.js'), contents: worker },
      { type: 'CompiledWasm', path: join(root, 'djs.wasm'), contents: djsWasm },
      { type: 'Text', path: join(root, 'sdk.txt'), contents: sdk },
    ],
    compatibilityDate: '2025-10-01',
    compatibilityFlags: ['nodejs_compat', 'experimental'],
    workerLoaders: { LOADER: {} },
  });
  await miniflare.ready;

  const request = async (path: string): Promise<{ ms: number; value: unknown }> => {
    const started = performance.now();
    const response = await miniflare.dispatchFetch(`http://bench${path}`);
    const text = await response.text();
    const ms = performance.now() - started;
    if (!response.ok) {
      throw new Error(`${path}: ${response.status} ${text.slice(0, 300)}`);
    }
    return { ms, value: (JSON.parse(text) as { value: unknown }).value };
  };
  const sample = async (path: string, before?: string): Promise<number> => {
    const times: number[] = [];
    for (let round = 0; round < rounds; round++) {
      if (before) {
        await request(before);
      }
      times.push((await request(path)).ms);
    }
    return median(times);
  };

  const rows: [string, number][] = [];
  rows.push(['no-op request (transport)', await sample('/noop')]);

  // djs: the base image is built once per Worker isolate; its first build is the cold start.
  const baseBuild = await request('/djs-base');
  rows.push([`djs: build base image (once; ${(Number(baseBuild.value) / 1024 / 1024).toFixed(1)} MB)`, baseBuild.ms]);
  rows.push(['djs: open a session (copy the image)', await sample('/djs-open')]);
  rows.push(['djs: fresh session + trivial program', await sample('/djs-cold/trivial')]);

  rows.push(['loader: fresh isolate, no SDK, trivial', await sample('/loader/trivial')]);
  rows.push(['loader: fresh isolate + SDK, trivial', await sample('/loader/trivial?sdk=1')]);

  for (const name of Object.keys(PROGRAMS)) {
    await request('/djs-open');
    rows.push([`djs: ${name}, in an open session`, await sample(`/djs-run/${name}`)]);
    rows.push([`loader: ${name}, fresh isolate + SDK`, await sample(`/loader/${name}?sdk=1`)]);
    await request(`/loader/${name}?sdk=1&warm=1`);
    rows.push([`loader: ${name}, warm isolate + SDK`, await sample(`/loader/${name}?sdk=1&warm=1`)]);
  }

  await miniflare.dispose();
  console.log(`\nSDK payload ${(sdk.length / 1024).toFixed(0)} KiB; median of ${rounds} requests (ms, from Node):\n`);
  console.log('| scenario | ms |\n| --- | --- |');
  for (const [name, ms] of rows) {
    console.log(`| ${name} | ${ms.toFixed(1)} |`);
  }
};

await main();
