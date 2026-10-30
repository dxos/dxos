//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { loadBundle } from './load-bundle.ts';
import * as PluginBundle from './PluginBundle.ts';

const tag = (identifier: string) => ({ identifier, arity: 'one' });

/** A bundle laid out as the plugin build emits it: plugin files at the root, shared packages in `vendor/`. */
const makeBundle = (overrides: Record<string, string | undefined> = {}): PluginBundle.Files => {
  const files: Record<string, string | undefined> = {
    'manifest.json': JSON.stringify({
      key: 'org.example.plugin.sample',
      name: 'Sample',
      version: '1.0.0',
      modules: [
        { id: 'Schema', url: './schema.mjs', requires: [], provides: [tag('org.example.schema')] },
        {
          id: 'Operations',
          url: './operations.mjs',
          requires: [],
          provides: [tag('org.example.operations')],
          environments: ['node', 'workerd'],
        },
        {
          id: 'Surfaces',
          url: './surfaces.mjs',
          requires: [],
          provides: [tag('org.example.surfaces')],
          environments: ['browser', 'tauri'],
        },
      ],
    }),
    'catalog.json': JSON.stringify({ operations: [], skills: [], types: [] }),
    'index.mjs': [
      "import { make } from '@dxos/app-framework/Plugin';",
      "export default make({ schema: () => import('./schema.mjs'), operations: () => import('./operations.mjs'), surfaces: () => import('./surfaces.mjs') });",
    ].join('\n'),
    'schema.mjs': "import { shared } from './chunk.mjs'; export default () => shared;",
    'operations.mjs':
      "import { name } from 'effect'; import { shared } from './chunk.mjs'; export default () => name + shared;",
    'surfaces.mjs': "import './assets/sample.css'; import { name } from 'effect'; export default () => name;",
    'chunk.mjs': "export const shared = 'shared';",
    'assets/sample.css': '.sample { color: red; }',
    'vendor/manifest.json': JSON.stringify({
      specifiers: { 'effect': 'effect/index.mjs', '@dxos/app-framework/Plugin': '@dxos/app-framework/Plugin.mjs' },
    }),
    'vendor/effect/index.mjs': "import { base } from '../chunk-vendor.mjs'; export const name = 'effect:' + base;",
    'vendor/@dxos/app-framework/Plugin.mjs': 'export const make = (loaders) => loaders;',
    'vendor/chunk-vendor.mjs': "export const base = 'base';",
    ...overrides,
  };
  const encoder = new TextEncoder();
  return Object.fromEntries(
    Object.entries(files).flatMap(([path, content]) =>
      content === undefined ? [] : [[path, encoder.encode(content)]],
    ),
  );
};

const messages = (files: PluginBundle.Files) =>
  PluginBundle.check(files).problems.map(({ path, message }) => `${path}: ${message}`);

describe('PluginBundle', () => {
  test('a well-formed bundle passes, with its workerd modules as roots', ({ expect }) => {
    const { problems, roots } = PluginBundle.check(makeBundle());
    expect(problems).toEqual([]);
    expect(roots).toEqual(['index.mjs', 'schema.mjs', 'operations.mjs']);
  });

  test('a browser body may import styles; a workerd module may not reach one', ({ expect }) => {
    expect(
      messages(makeBundle({ 'chunk.mjs': "import './assets/sample.css'; export const shared = 'shared';" })),
    ).toEqual(['assets/sample.css: a workerd module imports it: schema.mjs → chunk.mjs → assets/sample.css']);
  });

  test('a workerd module may not import a browser-only body statically', ({ expect }) => {
    expect(
      messages(makeBundle({ 'schema.mjs': "import render from './surfaces.mjs'; export default render;" })),
    ).toEqual([
      'surfaces.mjs: browser-only module Surfaces is imported statically by a workerd module: schema.mjs → surfaces.mjs',
    ]);
  });

  test('every bare import of the plugin is vendored, and vendor/ imports only itself', ({ expect }) => {
    expect(
      messages(
        makeBundle({
          'operations.mjs': "import { z } from 'zod'; export default () => z;",
          'vendor/chunk-vendor.mjs': "import 'react'; export const base = 'base';",
        }),
      ),
    ).toEqual([
      'operations.mjs: imports zod, which vendor/ does not provide',
      'vendor/chunk-vendor.mjs: vendor/ imports react bare; vendored packages import each other relatively',
    ]);
  });

  test('paths stay inside the bundle and name files that exist', ({ expect }) => {
    expect(
      messages(
        makeBundle({
          'schema.mjs': "import '../outside.mjs'; import './missing.mjs'; export default () => 1;",
          'vendor/manifest.json': JSON.stringify({ specifiers: { effect: 'effect/missing.mjs' } }),
        }),
      ),
    ).toEqual([
      'vendor/manifest.json: effect: no file effect/missing.mjs in vendor/',
      'index.mjs: imports @dxos/app-framework/Plugin, which vendor/ does not provide',
      'operations.mjs: imports effect, which vendor/ does not provide',
      'schema.mjs: imports ../outside.mjs, which is not in the bundle',
      'schema.mjs: imports ./missing.mjs, which is not in the bundle',
      'surfaces.mjs: imports effect, which vendor/ does not provide',
    ]);
  });

  test('a malformed manifest, a module that does not parse and a missing body are reported', ({ expect }) => {
    const manifest = JSON.stringify({
      key: 'org.example.plugin.sample',
      name: 'Sample',
      version: '1.0.0',
      modules: [{ id: 'Gone', url: './gone.mjs', requires: [], provides: [] }],
    });
    expect(messages(makeBundle({ 'manifest.json': manifest, 'chunk.mjs': 'export const = 1;' }))).toEqual([
      'chunk.mjs: does not parse: Unexpected token',
      'manifest.json: Gone: ./gone.mjs is not a file in the bundle',
    ]);
    expect(
      messages(
        makeBundle({ 'manifest.json': JSON.stringify({ key: 1, name: 'Sample', version: '1.0.0', modules: [] }) }),
      ),
    ).toEqual([expect.stringMatching(/^manifest\.json: .*key/s)]);
  });

  test('rewriteImports points the plugin bare imports at vendor/ and leaves vendor/ alone', ({ expect }) => {
    const files = makeBundle();
    const { vendor } = PluginBundle.check(files);
    const rewritten = PluginBundle.rewriteImports(files, vendor ?? { specifiers: {} });
    const decoded = (path: string) => new TextDecoder().decode(rewritten[path]);
    expect(decoded('operations.mjs')).toBe(
      'import { name } from "./vendor/effect/index.mjs"; import { shared } from \'./chunk.mjs\'; export default () => name + shared;',
    );
    expect(decoded('index.mjs')).toContain('from "./vendor/@dxos/app-framework/Plugin.mjs"');
    expect(rewritten['vendor/effect/index.mjs']).toBe(files['vendor/effect/index.mjs']);
  });

  test('the workerd modules import in workerd once rewritten', { timeout: 60_000 }, async ({ expect }) => {
    const files = makeBundle();
    const { roots } = PluginBundle.check(files);
    {
      await using bundle = await loadBundle(files);
      expect(await bundle.importModules(roots)).toEqual([]);
      // describe() needs the host, which this bundle does not vendor.
      await expect(bundle.describe()).rejects.toThrow(/does not provide @dxos\/plugin-host-cloudflare/);
    }

    await using throwing = await loadBundle(
      makeBundle({ 'schema.mjs': "throw new Error('boom'); export default () => 1;" }),
    );
    const failures = await throwing.importModules(['schema.mjs']);
    expect(failures.map(({ path }) => path)).toEqual(['schema.mjs']);
    expect(failures[0].message).toContain('boom');
  });
});
