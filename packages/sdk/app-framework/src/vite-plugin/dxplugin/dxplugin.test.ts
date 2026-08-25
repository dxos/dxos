//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
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

const writeDescriptor = () => {
  const dir = mkdtempSync(join(tmpdir(), 'dxplugin-'));
  const path = join(dir, DXPLUGIN_FILENAME);
  writeFileSync(path, DESCRIPTOR);
  return { dir, path };
};

/**
 * Invokes one of the plugin's hooks against a stub rollup context. Rollup's `PluginContext` is a
 * ~30-member interface a test cannot implement and `load` reaches exactly one of them, so the
 * structural gap is bridged here — once — rather than at each call site.
 */
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

describe('dxPluginManifest', () => {
  it('ignores files that are not descriptors', () => {
    expect(invoke(configure('serve').load, undefined, '/some/other.ts')).toBeNull();
  });

  it('serves module sources from the dev server, leaving them unbundled', () => {
    const { dir, path } = writeDescriptor();
    const emitted: { id?: string }[] = [];
    const code = load(configure('serve'), path, emitted);
    expect(code).toContain(`"src": "/@fs/${join(dir, 'src/surface.ts')}"`);
    expect(emitted).toEqual([]);
  });

  it('emits each module source as a build entrypoint and points src at the built chunk', () => {
    const { dir, path } = writeDescriptor();
    const emitted: { id?: string }[] = [];
    const code = load(configure('build'), path, emitted);
    // Declared, not inferred from an `import()` — a module reachable only through the descriptor
    // would otherwise be tree-shaken away.
    expect(emitted).toEqual([expect.objectContaining({ type: 'chunk', id: join(dir, 'src/surface.ts') })]);
    // Resolved at runtime by rollup to the emitted chunk's URL, so `.ts` becomes the shipped `.js`.
    expect(code).toContain('"src": import.meta.ROLLUP_FILE_URL_ref123');
  });

  it('carries the descriptor metadata through unchanged', () => {
    const { path } = writeDescriptor();
    const code = load(configure('serve'), path, []);
    expect(code).toContain('"key": "org.dxos.plugin.test"');
    expect(code).toContain('"id": "Surface"');
  });
});
