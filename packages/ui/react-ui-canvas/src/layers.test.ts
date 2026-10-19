//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

/**
 * The package's layers, lowest first. A module may import values only from its own layer or one below it, so no cycle
 * can form between layers; type-only imports are erased on emit and may point anywhere.
 */
const LAYERS = ['model', 'utils', 'engine', 'generator', 'hooks', 'components', 'builder', 'testing'] as const;

const SRC = dirname(fileURLToPath(import.meta.url));

const IMPORT = /^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'(\.[^']*)';/gm;

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sources(path);
    }
    return /\.tsx?$/.test(name) && !/\.(test|stories|spec)\.tsx?$/.test(name) ? [path] : [];
  });

const layerOf = (path: string): number => LAYERS.indexOf(relative(SRC, path).split('/')[0] as (typeof LAYERS)[number]);

type Edge = { from: string; to: string; names: string[] };

const valueImports = (): Edge[] =>
  sources(SRC).flatMap((from) =>
    [...readFileSync(from, 'utf8').matchAll(IMPORT)].flatMap(([, typeOnly, specifiers, path]) => {
      const names = typeOnly
        ? []
        : specifiers
            .split(',')
            .map((specifier) => specifier.trim())
            .filter((specifier) => specifier && !specifier.startsWith('type '));
      return names.length > 0 ? [{ from, to: normalize(join(dirname(from), path)), names }] : [];
    }),
  );

describe('layers', () => {
  // Barrels across folders are the `folder-barrel-imports` lint rule's (.oxlintrc.json); this test keeps the order.
  test('no module imports a value from a layer above its own', ({ expect }) => {
    const upward = valueImports()
      .filter(({ from, to }) => layerOf(from) >= 0 && layerOf(to) > layerOf(from))
      .map(({ from, to, names }) => `${relative(SRC, from)} -> ${relative(SRC, to)}: ${names.join(', ')}`);
    expect(upward).toEqual([]);
  });
});
