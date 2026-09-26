//
// Copyright 2026 DXOS.org
//

// Which wasm a bundle carries: bundles each case for the browser, resolving from Composer's directory as
// Composer does, and lists the inputs that carry or instantiate wasm.
// Usage: node --conditions=source src/bench/wasm/analyze.ts

import { type Plugin, build } from 'esbuild';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const repo = join(import.meta.dirname, '../../../../../../..');
const composer = join(repo, 'packages/apps/composer-app/src/util');

/** The storage probe as Composer has it, and with an import of only the module it needs. */
const cases: Record<string, string> = {
  'storage probe, root import': `export const probe = async () => (await import('@dxos/client-services')).Storage.createStorageObjects;`,
  'storage probe, narrow import': `export { createStorageObjects } from '${join(repo, 'packages/sdk/client-services/src/internal/storage/storage.ts')}';`,
};

/** Vite's query imports (`?raw`, `?url`, `?worker`) as empty modules, which is enough to see what is bundled. */
const viteQueries: Plugin = {
  name: 'vite-queries',
  setup: (builder) => {
    builder.onResolve({ filter: /\?(raw|url|worker|inline|init)$/ }, (args) => ({
      path: args.path,
      namespace: 'vite-query',
    }));
    builder.onLoad({ filter: /.*/, namespace: 'vite-query' }, () => ({ contents: 'export default "";', loader: 'js' }));
  },
};

/** Modules that carry or instantiate wasm: sodium and its hash modules, `.wasm` files, base64 wasm payloads. */
const WASM =
  /(sodium-(javascript|universal|native)|hypercore-crypto|blake2b-wasm|sha256-wasm|sha512-wasm|siphash24|xsalsa20|wasm-base64|_bg_base64|automerge_wasm|\.wasm($|\?))/;

for (const [name, contents] of Object.entries(cases)) {
  const result = await build({
    stdin: { contents, resolveDir: composer, loader: 'ts' },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    conditions: ['source', 'browser'],
    write: false,
    metafile: true,
    logLevel: 'silent',
    // Node built-ins stay out, as Composer's bundler polyfills or drops them.
    external: [...builtinModules, ...builtinModules.map((builtin) => `node:${builtin}`)],
    loader: { '.wasm': 'binary' },
    plugins: [viteQueries],
  });
  const inputs = Object.entries(result.metafile.inputs);
  const bytes = inputs.reduce((sum, [, input]) => sum + input.bytes, 0);
  const wasm = inputs
    .filter(([path]) => WASM.test(path))
    .map(([path, input]) => `${path.replace(/^.*node_modules\//, '')} (${input.bytes} B)`);
  console.log(`${name}: ${inputs.length} modules, ${(bytes / 1048576).toFixed(1)} MB of input`);
  for (const line of wasm.length > 0 ? wasm : ['no wasm modules']) {
    console.log('  ', line);
  }
}
