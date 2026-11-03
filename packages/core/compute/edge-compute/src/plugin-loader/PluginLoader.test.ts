//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as PluginLoader from './PluginLoader.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const files = (entries: Record<string, string>): PluginLoader.Files =>
  Object.fromEntries(Object.entries(entries).map(([path, content]) => [path, encoder.encode(content)]));

/** A bundle as `composerPlugin` emits it: flat plugin files, shared packages in `vendor/`. */
const bundle = (overrides: Record<string, string> = {}) =>
  files({
    'manifest.json': JSON.stringify({
      key: 'org.example.plugin.sample',
      modules: [{ id: 'Operations', url: './operations.mjs', adapter: { url: '@dxos/app-toolkit/SchemaAdapter' } }],
    }),
    'operations.mjs': "import { name } from 'effect'; export * from 'effect'; export default () => import('effect');",
    'vendor/manifest.json': JSON.stringify({
      specifiers: {
        'effect': 'effect.mjs',
        '@dxos/app-toolkit/SchemaAdapter': '@dxos/app-toolkit/SchemaAdapter.mjs',
        '@dxos/plugin-host-cloudflare': '@dxos/plugin-host-cloudflare.mjs',
      },
    }),
    'vendor/effect.mjs': "import { base } from './chunk.mjs'; export const name = base;",
    'vendor/chunk.mjs': "export const base = 'base';",
    'vendor/unused.mjs': 'export const unused = 1;',
    'vendor/@dxos/app-toolkit/SchemaAdapter.mjs': "import { name } from 'effect'; export default name;",
    'vendor/@dxos/plugin-host-cloudflare.mjs': "export { name } from 'effect';",
    ...overrides,
  });

describe('PluginLoader', () => {
  test('rewrites static, re-exported and dynamic bare imports to the files the import map names', async ({
    expect,
  }) => {
    const source = bundle();
    const rewritten = await PluginLoader.rewriteImports(source, PluginLoader.readVendor(source) ?? {});
    expect(decoder.decode(rewritten['operations.mjs'])).toBe(
      "import { name } from './vendor/effect.mjs'; export * from './vendor/effect.mjs'; export default () => import(\"./vendor/effect.mjs\");",
    );
    expect(decoder.decode(rewritten['vendor/@dxos/app-toolkit/SchemaAdapter.mjs'])).toBe(
      "import { name } from '../../effect.mjs'; export default name;",
    );
  });

  test('drops vendored files nothing reaches and builds the plugin from its manifest alone', async ({ expect }) => {
    const { files: code, main } = await PluginLoader.workerCode(bundle());
    expect(code['vendor/unused.mjs']).toBeUndefined();
    expect(code['vendor/effect.mjs']).toBeDefined();
    // The main module builds the plugin from its manifest, with literal imports of bodies and adapters.
    expect(main).toContain(`import('./vendor/@dxos/plugin-host-cloudflare.mjs')`);
    expect(main).toContain(`"./operations.mjs": () => import("./operations.mjs")`);
    expect(main).toContain(
      `"@dxos/app-toolkit/SchemaAdapter": () => import("./vendor/@dxos/app-toolkit/SchemaAdapter.mjs")`,
    );
    expect(main).not.toContain('deps/');
  });

  test('ships only what the bodies that run on workerd reach', async ({ expect }) => {
    const manifest = JSON.stringify({
      key: 'org.example.plugin.sample',
      modules: [
        { id: 'Operations', url: './operations.mjs', environments: ['node', 'workerd'] },
        { id: 'Surfaces', url: './surfaces.mjs', environments: ['browser'] },
      ],
    });
    const vendor = JSON.stringify({
      specifiers: {
        'effect': 'effect.mjs',
        'react-dom': 'react-dom.mjs',
        '@dxos/plugin-host-cloudflare': '@dxos/plugin-host-cloudflare.mjs',
      },
    });
    const { files: code, main } = await PluginLoader.workerCode(
      bundle({
        'manifest.json': manifest,
        'vendor/manifest.json': vendor,
        'surfaces.mjs': "import { render } from 'react-dom'; import './chunk-ui.mjs'; export default render;",
        'chunk-ui.mjs': 'export const ui = 1;',
        'vendor/react-dom.mjs': 'export const render = 1;',
      }),
    );
    expect(Object.keys(code).sort()).toEqual([
      'operations.mjs',
      'vendor/@dxos/plugin-host-cloudflare.mjs',
      'vendor/chunk.mjs',
      'vendor/effect.mjs',
    ]);
    expect(main).toContain(`"./operations.mjs": () => import("./operations.mjs")`);
    expect(main).not.toContain('import("./surfaces.mjs")');
  });

  test('loads a local adapter chunk by its path in the bundle', async ({ expect }) => {
    const manifest = JSON.stringify({
      key: 'org.example.plugin.sample',
      modules: [{ id: 'Operations', url: './operations.mjs', adapter: { url: './adapter.mjs' } }],
    });
    const { main } = await PluginLoader.workerCode(
      bundle({ 'manifest.json': manifest, 'adapter.mjs': 'export default 1;' }),
    );
    expect(main).toContain(`"./adapter.mjs": () => import("./adapter.mjs")`);
  });

  test('Worker Loader modules hold the main module, code and wasm, and no source maps', async ({ expect }) => {
    const code = await PluginLoader.workerCode(bundle({ 'operations.mjs.map': '{}', 'vendor/asset.wasm': '\0asm' }));
    const modules = PluginLoader.toLoaderModules(code);
    expect(modules[PluginLoader.MAIN_MODULE]).toEqual({ js: code.main });
    expect(Object.keys(modules)).not.toContain('operations.mjs.map');
    expect(modules['operations.mjs']).toHaveProperty('js');
  });
});
