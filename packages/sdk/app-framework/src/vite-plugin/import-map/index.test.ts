//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'vitest';

import { getPackageEntrypoints } from './index.ts';

/** Materialises a package on disk so wildcard exports have a directory to walk. */
const makePackage = (exports: Record<string, unknown>, files: string[]): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'import-map-'));
  for (const file of files) {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, '');
  }
  const packageJsonPath = path.join(dir, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify({ exports }));
  return packageJsonPath;
};

describe('getPackageEntrypoints', () => {
  test('expands wildcard exports by walking the target directory', ({ expect }) => {
    const packageJsonPath = makePackage({ '.': './dist/index.js', './*': './dist/*.js' }, [
      'dist/index.js',
      'dist/Atom.js',
      'dist/Registry.js',
    ]);

    expect(getPackageEntrypoints('@example/pkg', packageJsonPath).sort()).toEqual([
      '@example/pkg',
      '@example/pkg/Atom',
      '@example/pkg/Registry',
      '@example/pkg/index',
    ]);
  });

  // A `null` target means "explicitly not exported". Emitting one yields a specifier the resolver
  // rejects, which aborts the whole app build — the shape `@effect/atom-react` ships.
  test('honours null targets, including patterns a wildcard would otherwise match', ({ expect }) => {
    const packageJsonPath = makePackage(
      {
        '.': './dist/index.js',
        './*': './dist/*.js',
        './internal/*': null,
        './index': null,
        './*/index': null,
      },
      ['dist/index.js', 'dist/Atom.js', 'dist/internal/registry.js', 'dist/nested/index.js'],
    );

    expect(getPackageEntrypoints('@example/pkg', packageJsonPath).sort()).toEqual([
      '@example/pkg',
      '@example/pkg/Atom',
    ]);
  });
});
