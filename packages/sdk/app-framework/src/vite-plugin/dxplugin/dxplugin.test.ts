//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DXPLUGIN_FILENAME, dxPluginManifest } from './index';

const DESCRIPTOR = `
{
  // A descriptor with a comment, which plain JSON handling would reject.
  "key": "org.dxos.plugin.test",
  "name": "Test",
  "modules": [{ "id": "Surface", "src": "./src/surface.ts" }],
}
`;

describe('dxPluginManifest', () => {
  test('ignores files that are not descriptors', ({ expect }) => {
    expect(invoke(configure('serve').load, undefined, '/some/other.ts')).toBeNull();
  });

  test('serves module sources from the dev server, leaving them unbundled', ({ expect }) => {
    const { dir, path } = writeDescriptor();
    const emitted: { id?: string }[] = [];
    const code = load(configure('serve'), path, emitted);
    expect(code).toContain(`src: "/@fs/${join(dir, 'src/surface.ts')}"`);
    expect(emitted).toEqual([]);
  });

  test('emits each module source as a build entrypoint and points src at the built chunk', ({ expect }) => {
    const { dir, path } = writeDescriptor();
    const emitted: { id?: string }[] = [];
    const code = load(configure('build'), path, emitted);
    // Declared, not inferred from an `import()` — a module reachable only through the descriptor
    // would otherwise be tree-shaken away.
    expect(emitted).toEqual([expect.objectContaining({ type: 'chunk', id: join(dir, 'src/surface.ts') })]);
    // Resolved at runtime by rollup to the emitted chunk's URL, so `.ts` becomes the shipped `.js`.
    expect(code).toContain('src: import.meta.ROLLUP_FILE_URL_ref123');
  });

  test('carries the descriptor metadata through unchanged', ({ expect }) => {
    const { path } = writeDescriptor();
    const code = load(configure('serve'), path, []);
    expect(code).toContain('"key": "org.dxos.plugin.test"');
    // Module fields are serialized per module, so they carry through in compact form.
    expect(code).toContain('"id":"Surface"');
  });

  test('assigns each src to its own module, whatever an authored field holds', ({ expect }) => {
    // A field whose value looks like a generated marker must not capture another module's `src`.
    const { dir, path } = writeDescriptor(`
      {
        "key": "org.dxos.plugin.test",
        "name": "__dxplugin_src_0__",
        "modules": [
          { "id": "__dxplugin_src_0__", "src": "./src/first.ts" },
          { "id": "Second", "src": "./src/second.ts" },
        ],
      }
    `);
    const code = load(configure('serve'), path, []);
    expect(code).toContain(`src: "/@fs/${join(dir, 'src/first.ts')}"`);
    expect(code).toContain(`src: "/@fs/${join(dir, 'src/second.ts')}"`);
  });
});

const writeDescriptor = (descriptor = DESCRIPTOR) => {
  const dir = mkdtempSync(join(tmpdir(), 'dxplugin-'));
  const path = join(dir, DXPLUGIN_FILENAME);
  writeFileSync(path, descriptor);
  return { dir, path };
};

// Rollup's `PluginContext` is a ~30-member interface a test cannot implement, and `load` reaches
// exactly one of them, so the structural gap is bridged here rather than at each call site.
const invoke = (hook: unknown, self: unknown, ...args: unknown[]): any =>
  (hook as (this: unknown, ...args: unknown[]) => any).call(self, ...args);

/** Stub context recording the chunks `load` emits, and handing back a fixed reference id. */
const context = (emitted: { id?: string }[]) => ({
  emitFile: (file: { id: string }) => {
    emitted.push(file);
    return 'ref123';
  },
});

const load = (plugin: ReturnType<typeof dxPluginManifest>, path: string, emitted: { id?: string }[]): string => {
  const result = invoke(plugin.load, context(emitted), path);
  return typeof result === 'string' ? result : result.code;
};

const configure = (command: 'serve' | 'build') => {
  const plugin = dxPluginManifest();
  invoke(plugin.configResolved, undefined, { command });
  return plugin;
};
