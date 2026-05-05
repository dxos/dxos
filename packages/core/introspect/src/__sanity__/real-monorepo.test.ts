//
// Copyright 2026 DXOS.org
//

// Sanity test: run the introspector against the real monorepo to verify the
// indexer survives real-world packages. Skipped by default; set
// INTROSPECT_REAL=1 to enable.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { createIntrospector } from '../introspector';

const REAL = process.env.INTROSPECT_REAL === '1';
const __dirname = dirname(fileURLToPath(import.meta.url));
// packages/core/introspect/src/__sanity__ -> repo root is 5 levels up.
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

describe.skipIf(!REAL)('real monorepo', () => {
  test('discovers a reasonable number of packages and well-known symbols', async ({ expect }) => {
    const intro = createIntrospector({ monorepoRoot: MONOREPO_ROOT });
    await intro.ready;

    const packages = intro.listPackages();
    expect(packages.length).toBeGreaterThan(100);

    const introspectPkg = intro.getPackage('@dxos/introspect');
    expect(introspectPkg).not.toBeNull();
    expect(introspectPkg!.entryPoints[0]).toContain('src/index.ts');

    const matches = intro.findSymbol('createIntrospector');
    expect(matches.some((m) => m.ref === '@dxos/introspect#createIntrospector')).toBe(true);

    const detail = intro.getSymbol('@dxos/introspect#createIntrospector');
    expect(detail).not.toBeNull();
    expect(detail!.kind).toBe('function');

    // Plugin detection — narrow to a single known plugin so we don't pay the
    // cost of scanning every package's plugin candidates. Markdown is a long-
    // standing fixture; if its detection regresses we want to know.
    const markdownDetail = intro.getPlugin('org.dxos.plugin.markdown');
    expect(markdownDetail).not.toBeNull();
    expect(markdownDetail!.package).toBe('@dxos/plugin-markdown');
    expect(markdownDetail!.surfaces.length).toBeGreaterThan(0);
    expect(markdownDetail!.operations.some((op) => op.key === 'org.dxos.function.markdown.create')).toBe(true);

    intro.dispose();
  }, 600_000);
});
