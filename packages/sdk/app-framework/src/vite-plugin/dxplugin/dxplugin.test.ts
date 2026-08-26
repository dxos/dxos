//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DXPLUGIN_BUILT_FILENAME, DXPLUGIN_FILENAME, dxPluginManifest } from './index';

const DESCRIPTOR = `
{
  // A descriptor with a comment, which plain JSON handling would reject.
  "$schema": "../../../node_modules/@dxos/app-framework/dxplugin.schema.json",
  "key": "org.dxos.plugin.test",
  "name": "Test",
  "modules": [{ "id": "Surface", "src": "./src/surface.ts" }],
}
`;

describe('dxPluginManifest', () => {
  test('ignores files that are not descriptors', ({ expect }) => {
    expect(invoke(configure('serve').load, undefined, '/some/other.ts')).toBeNull();
  });

  test('a descriptor imports as its URL, never as a module wrapping the data', ({ expect }) => {
    const { dir, path } = writeDescriptor();
    const emitted: Emitted[] = [];
    const code = load(configure('serve'), path, emitted);
    // The dev server answers that URL with the descriptor, so nothing is bundled to reach it.
    expect(code).toBe(`export default "/@fs/${join(dir, DXPLUGIN_FILENAME).replace(/^\//, '')}";\n`);
    expect(emitted).toEqual([]);
  });

  test('a build points the URL at an emitted asset and declares each module a chunk', ({ expect }) => {
    const { dir, path } = writeDescriptor();
    const emitted: Emitted[] = [];
    const code = load(configure('build'), path, emitted);
    // Declared, not inferred from an `import()` — a module reachable only through the descriptor
    // would otherwise be tree-shaken away.
    expect(emitted).toContainEqual(expect.objectContaining({ type: 'chunk', id: join(dir, 'src/surface.ts') }));
    expect(emitted).toContainEqual(expect.objectContaining({ type: 'asset', name: DXPLUGIN_BUILT_FILENAME }));
    expect(code).toContain('import.meta.ROLLUP_FILE_URL_');
  });

  test('the emitted asset names the chunks that shipped, and drops the authoring aid', ({ expect }) => {
    const { path } = writeDescriptor();
    const emitted: Emitted[] = [];
    const plugin = configure('build');
    load(plugin, path, emitted);

    const bundle: Record<string, { type: string; source?: string }> = {
      'chunk-surface.mjs': { type: 'asset' },
      [DXPLUGIN_BUILT_FILENAME]: { type: 'asset' },
    };
    invoke(plugin.generateBundle, context(emitted), {}, bundle);

    const descriptor = JSON.parse(bundle[DXPLUGIN_BUILT_FILENAME].source!);
    expect(descriptor.modules).toEqual([{ id: 'Surface', src: './chunk-surface.mjs' }]);
    // `$schema` points into the workspace's `node_modules` — meaningless once published.
    expect(descriptor).not.toHaveProperty('$schema');
  });

  test('builds a named manifest without waiting for a module to import it', ({ expect }) => {
    const { dir } = writeDescriptor();
    const emitted: Emitted[] = [];
    const plugin = configure('build', dir);
    invoke(plugin.buildStart, context(emitted));
    expect(emitted).toContainEqual(expect.objectContaining({ type: 'chunk', id: join(dir, 'src/surface.ts') }));
    expect(emitted).toContainEqual(expect.objectContaining({ type: 'asset', fileName: DXPLUGIN_BUILT_FILENAME }));
  });
});

type Emitted = { type?: string; id?: string; name?: string; fileName?: string; source?: string };

const writeDescriptor = (descriptor = DESCRIPTOR) => {
  const dir = mkdtempSync(join(tmpdir(), 'dxplugin-'));
  const path = join(dir, DXPLUGIN_FILENAME);
  writeFileSync(path, descriptor);
  return { dir, path };
};

// Rollup's `PluginContext` is a ~30-member interface a test cannot implement, and these hooks reach
// only a few of them, so the structural gap is bridged here rather than at each call site.
const invoke = (hook: unknown, self: unknown, ...args: unknown[]): any =>
  (hook as (this: unknown, ...args: unknown[]) => any).call(self, ...args);

/** Stub context recording what the hooks emit, and naming the one chunk deterministically. */
const context = (emitted: Emitted[]) => ({
  // Names the browser dev-server environment, which is what selects the `/@fs/` form.
  environment: { name: 'client' },
  getFileName: (ref: string) => (ref === 'asset0' ? DXPLUGIN_BUILT_FILENAME : 'chunk-surface.mjs'),
  emitFile: (file: Emitted) => {
    emitted.push(file);
    return file.type === 'asset' ? 'asset0' : 'chunk0';
  },
});

const load = (plugin: ReturnType<typeof dxPluginManifest>, path: string, emitted: Emitted[]): string => {
  const result = invoke(plugin.load, context(emitted), path);
  return typeof result === 'string' ? result : result.code;
};

const configure = (command: 'serve' | 'build', root?: string) => {
  const plugin = dxPluginManifest();
  invoke(plugin.configResolved, undefined, { command, root });
  return plugin;
};
