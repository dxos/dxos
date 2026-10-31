//
// Copyright 2026 DXOS.org
//

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));

/** The editor application, which builds on this package and so must never be imported by it. */
const EDITOR = '@dxos/react-ui-canvas-editor';

/** The 3D renderer's runtime, which only the `/3d` and `/io` entries may load. */
const RENDERER = /^(@babylonjs\/|manifold-3d)/;

/** The entries that must load neither the renderer nor the editor (package.json `exports`). */
const LIGHT_ENTRIES = ['index.ts', 'headless.ts', 'generator/motion.ts', 'generator/worker.ts', 'testing/index.ts'];

// `import type` and `export type` are erased on emit, so only the rest load a module.
const STATEMENT = /^(?:import|export)\s+(type\s+)?(?:[^;'"]*?\s+from\s+)?'([^']+)';/gms;

type Reference = { specifier: string; typeOnly: boolean };

const references = (file: string): Reference[] =>
  [...readFileSync(file, 'utf8').matchAll(STATEMENT)].map(([, typeOnly, specifier]) => ({
    specifier,
    typeOnly: typeOnly !== undefined,
  }));

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

/** Every module and package an entry loads at runtime, through its relative value imports. */
const runtimeGraph = (entry: string): { files: Set<string>; packages: Map<string, string> } => {
  const packages = new Map<string, string>();
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) {
      return;
    }
    seen.add(file);
    for (const { specifier, typeOnly } of references(file)) {
      if (typeOnly) {
        continue;
      }
      if (specifier.startsWith('.')) {
        const target = normalize(join(dirname(file), specifier));
        existsSync(target) && visit(target);
      } else if (!packages.has(specifier)) {
        packages.set(specifier, relative(SRC, file));
      }
    }
  };
  visit(join(SRC, entry));
  return { files: seen, packages };
};

/** Every package an entry loads at runtime, with the file that imports it. */
const runtimePackages = (entry: string): Map<string, string> => runtimeGraph(entry).packages;

/** React and the React UI packages, which an operation running in node or workerd must not load. */
const REACT = /^(react|react-dom)(\/|$)|^@dxos\/react-/;

describe('entries', () => {
  test.for(LIGHT_ENTRIES)('%s loads neither the 3D renderer nor the editor', (entry, { expect }) => {
    const loaded = [...runtimePackages(entry)]
      .filter(([specifier]) => RENDERER.test(specifier) || specifier.startsWith(EDITOR))
      .map(([specifier, file]) => `${file} -> ${specifier}`);
    expect(loaded).toEqual([]);
  });

  test('/headless loads no React module, so operations can apply the mode rule', ({ expect }) => {
    const { files, packages } = runtimeGraph('headless.ts');
    const loaded = [
      ...[...files].filter((file) => file.endsWith('.tsx')).map((file) => relative(SRC, file)),
      ...[...packages]
        .filter(([specifier]) => REACT.test(specifier))
        .map(([specifier, file]) => `${file} -> ${specifier}`),
    ];
    expect(loaded).toEqual([]);
  });

  test('the 3D entry is where the renderer loads', ({ expect }) => {
    expect([...runtimePackages('three/index.ts').keys()].some((specifier) => RENDERER.test(specifier))).toBe(true);
  });

  test('no module imports the editor package', ({ expect }) => {
    const importers = sources(SRC)
      .filter((file) => references(file).some(({ specifier }) => specifier.startsWith(EDITOR)))
      .map((file) => relative(SRC, file));
    expect(importers).toEqual([]);
  });

  test('the package does not depend on the editor package', ({ expect }) => {
    const manifest = JSON.parse(readFileSync(join(SRC, '..', 'package.json'), 'utf8'));
    const declared = ['dependencies', 'devDependencies', 'peerDependencies'].flatMap((field) =>
      Object.keys(manifest[field] ?? {}),
    );
    expect(declared).not.toContain(EDITOR);
  });
});
