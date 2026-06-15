//
// Copyright 2026 DXOS.org
//

// Sanity test: run plugin extraction against the real monorepo to verify
// surfaces/capabilities/operations/schemas are discovered for a known plugin.
// Skipped by default; set INTROSPECT_REAL=1 to enable.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { createIntrospector } from '../introspector';

const REAL = process.env.INTROSPECT_REAL === '1';
const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const PLUGIN_ID = 'org.dxos.plugin.code';

describe.skipIf(!REAL)('plugins (real monorepo)', () => {
  test('discovers plugin-code and its surfaces / capabilities / schemas', async ({ expect }) => {
    // Plugin extraction is independent of symbol pre-warm, so disable it for speed.
    const intro = createIntrospector({ rootPath: MONOREPO_ROOT, prewarm: false, cache: false });
    await intro.ready;

    const plugins = intro.listPlugins();
    const code = plugins.find((plugin) => plugin.id === PLUGIN_ID);
    expect(code).toBeDefined();
    expect(code!.package).toBe('@dxos/plugin-code');
    // tags + dependsOn are always present (possibly empty) per the schema.
    expect(Array.isArray(code!.tags)).toBe(true);
    expect(Array.isArray(code!.dependsOn)).toBe(true);
    // plugin-code's package.json declares workspace deps on plugin-graph,
    // plugin-space, plugin-client, plugin-testing — at least the first two
    // are themselves plugins, so dependsOn should pick them up.
    expect(code!.dependsOn).toEqual(expect.arrayContaining(['org.dxos.plugin.graph', 'org.dxos.plugin.space']));

    // plugin-assistant's meta declares `tags: ['labs']` — verify tag extraction.
    const assistant = plugins.find((plugin) => plugin.id === 'org.dxos.plugin.assistant');
    expect(assistant).toBeDefined();
    expect(assistant!.tags).toEqual(['labs']);

    // Core plugins listed in composer-app's `getCore` are tagged `'system'`.
    const space = plugins.find((plugin) => plugin.id === 'org.dxos.plugin.space');
    expect(space?.tags).toContain('system');

    const surfaces = intro.listSurfaces(PLUGIN_ID);
    const ids = surfaces.map((surface) => surface.id);
    expect(ids).toEqual(expect.arrayContaining(['spec-article', 'code-article', 'code-settings']));
    expect(surfaces.find((surface) => surface.id === 'code-article')!.role).toEqual(
      expect.arrayContaining(['article', 'section']),
    );

    const capabilities = intro.listCapabilities(PLUGIN_ID);
    const types = capabilities.map((capability) => capability.type);
    expect(types).toEqual(expect.arrayContaining(['Capabilities.ReactSurface']));

    const schemas = intro.listSchemas(PLUGIN_ID);
    const names = schemas.map((schema) => schema.name);
    expect(names).toEqual(expect.arrayContaining(['Spec.Spec', 'CodeProject.CodeProject', 'SourceFile.SourceFile']));

    // Without an id, returns aggregate across all plugins.
    expect(intro.listSurfaces().length).toBeGreaterThan(surfaces.length);

    // Chess uses `trim` tagged-template literal for its description — the
    // indexer should resolve it (no longer returning undefined).
    const chess = plugins.find((plugin) => plugin.id === 'org.dxos.plugin.chess');
    expect(chess).toBeDefined();
    expect(chess!.description).toMatch(/Full-featured chess game/);

    intro.dispose();
  }, 30_000);
});
