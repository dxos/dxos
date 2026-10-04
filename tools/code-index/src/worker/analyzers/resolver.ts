//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { ResolverFactory } from 'oxc-resolver';

import type { Resolve } from './common.ts';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

/** `./dist/types/src/x/index.d.ts` → `src/x/index`: the declaration emitted for a source module. */
const DECLARATION = /^\.\/dist\/types\/(.+)\.d\.[cm]?ts$/;

type ImportsMap = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A malformed manifest leaves the import unresolved rather than failing the importing file. */
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** The `imports` entry for `specifier`: an exact key, else the single-`*` pattern it matches. */
const importsEntry = (imports: ImportsMap, specifier: string): { target: unknown; star?: string } | undefined => {
  if (specifier in imports) {
    return { target: imports[specifier] };
  }
  for (const [key, target] of Object.entries(imports)) {
    const [prefix, suffix, extra] = key.split('*');
    if (
      suffix !== undefined &&
      extra === undefined &&
      specifier.startsWith(prefix) &&
      specifier.endsWith(suffix) &&
      specifier.length >= prefix.length + suffix.length
    ) {
      return { target, star: specifier.slice(prefix.length, specifier.length - suffix.length) };
    }
  }
  return undefined;
};

/**
 * Resolves a `#subpath` import whose `source` condition is itself conditional — the shape `dx-plugin`
 * writes for `#capabilities`, pointing each runtime at a generated, gitignored `gen/<env>.ts` slice.
 * The generator reads the barrel its `types` target was emitted from, so that source module is what
 * the import stands for, whether or not the slices exist in this checkout.
 */
const createSourceImportsFallback = () => {
  const manifests = new Map<string, { dir: string; imports: ImportsMap } | undefined>();
  const manifestFor = (dir: string): { dir: string; imports: ImportsMap } | undefined => {
    if (manifests.has(dir)) {
      return manifests.get(dir);
    }
    const file = join(dir, 'package.json');
    let found: { dir: string; imports: ImportsMap } | undefined;
    if (existsSync(file)) {
      // Node scopes `#imports` to the nearest package.json, even one without an `imports` field.
      const parsed = parseJson(readFileSync(file, 'utf8'));
      found = { dir, imports: isRecord(parsed) && isRecord(parsed.imports) ? parsed.imports : {} };
    } else {
      const parent = dirname(dir);
      found = parent === dir ? undefined : manifestFor(parent);
    }
    manifests.set(dir, found);
    return found;
  };

  return (fromFile: string, specifier: string): string | undefined => {
    if (!specifier.startsWith('#')) {
      return undefined;
    }
    const manifest = manifestFor(dirname(fromFile));
    const entry = manifest && importsEntry(manifest.imports, specifier);
    if (!entry || !isRecord(entry.target) || !isRecord(entry.target.source) || typeof entry.target.types !== 'string') {
      return undefined;
    }
    const declaration = DECLARATION.exec(entry.target.types.replace('*', entry.star ?? '*'));
    if (!declaration) {
      return undefined;
    }
    return SOURCE_EXTENSIONS.map((extension) => join(manifest.dir, declaration[1] + extension)).find((candidate) =>
      existsSync(candidate),
    );
  };
};

/**
 * oxc resolver over the repository, with the extension set the indexer walks.
 *
 * `resolveFileSync` rather than `sync`: it takes the importing *file* and discovers the enclosing
 * `tsconfig.json` by walking up from it, so an import that resolves through
 * `compilerOptions.paths` binds. `sync` takes a directory and discovers no tsconfig at all, which
 * left those edges missing from the index entirely.
 */
export const createResolver = (root: string): Resolve => {
  const factory = new ResolverFactory({
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    conditionNames: ['source', 'import', 'default'],
    tsconfig: 'auto',
  });
  const fallback = createSourceImportsFallback();
  return (fromFile, specifier) => {
    const absolute = resolvePath(root, fromFile);
    return factory.resolveFileSync(absolute, specifier).path ?? fallback(absolute, specifier);
  };
};
