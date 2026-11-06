//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type * as Vite from 'vite';

import type * as VitePlugin from '@dxos/app-framework/vite-plugin';

import { PublishError } from './errors.ts';

/** The config files `vite build` looks for in the project root, in its order. */
const VITE_CONFIG_FILES = [
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
  'vite.config.cjs',
  'vite.config.mts',
  'vite.config.cts',
];

/** The export conditions a Node ESM `import` matches, in priority order. */
const IMPORT_CONDITIONS = ['import', 'node', 'default'];

/**
 * Whether `publish.buildCommand` is the project's plain Vite build, which `dx registry publish` runs in process rather
 * than in a subprocess; an unset command means the same build.
 */
export const isViteBuild = (buildCommand: string | undefined): boolean =>
  buildCommand === undefined || /^\s*vite\s+build\s*$/.test(buildCommand);

const conditionTarget = (target: unknown): string | undefined => {
  if (typeof target === 'string') {
    return target;
  }
  if (Array.isArray(target)) {
    return target.map(conditionTarget).find(Predicate.isNotUndefined);
  }
  if (Predicate.isObject(target)) {
    for (const condition of IMPORT_CONDITIONS) {
      const resolved = conditionTarget(target[condition]);
      if (resolved !== undefined) {
        return resolved;
      }
    }
  }
  return undefined;
};

/**
 * The file an `import` of `specifier` from `dir` loads, read from the package's `exports` (no subpath patterns).
 * Resolved by hand because the compiled `dx` binary's own resolver cannot see a `node_modules` outside its embedded
 * files, and Node's `require.resolve` ignores an `import`-only export.
 */
export const resolveImport = (dir: string, specifier: string): string | undefined => {
  const segments = specifier.split('/');
  const name = (specifier.startsWith('@') ? segments.slice(0, 2) : segments.slice(0, 1)).join('/');
  const subpath = `.${specifier.slice(name.length)}`;
  for (let current = dir; ; current = dirname(current)) {
    const packageDir = join(current, 'node_modules', name);
    if (existsSync(join(packageDir, 'package.json'))) {
      const manifest: unknown = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
      if (!Predicate.isObject(manifest)) {
        return undefined;
      }
      const { exports } = manifest;
      if (exports === undefined) {
        const main = subpath === '.' ? (manifest.module ?? manifest.main ?? 'index.js') : subpath;
        return typeof main === 'string' ? join(packageDir, main) : undefined;
      }
      const bySubpath = Predicate.isObject(exports) && Object.keys(exports).some((key) => key.startsWith('.'));
      const target = conditionTarget(bySubpath ? exports[subpath] : subpath === '.' ? exports : undefined);
      return target === undefined ? undefined : join(packageDir, target);
    }
    if (dirname(current) === current) {
      return undefined;
    }
  }
};

const importFrom = Effect.fnUntraced(function* (dir: string, specifier: string) {
  const entry = resolveImport(dir, specifier);
  if (entry === undefined) {
    return yield* Effect.fail(
      new PublishError({
        message: `${specifier} is not installed in the plugin project: install it, or set publish.buildCommand.`,
        context: { dir },
      }),
    );
  }
  return yield* Effect.tryPromise({
    try: () => import(/* @vite-ignore */ pathToFileURL(entry).href),
    catch: (error) => new PublishError({ message: `Failed to load ${specifier}.`, context: { entry }, cause: error }),
  });
});

/** Runs `effect` with `dir` as the working directory and `env` set, restoring both after. */
const withProcessScope = <A, E, R>(
  dir: string,
  env: Readonly<Record<string, string>>,
  effect: Effect.Effect<A, E, R>,
) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = { cwd: process.cwd(), env: Object.keys(env).map((key) => [key, process.env[key]] as const) };
      process.chdir(dir);
      Object.assign(process.env, env);
      return previous;
    }),
    () => effect,
    (previous) =>
      Effect.sync(() => {
        for (const [key, value] of previous.env) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
        process.chdir(previous.cwd);
      }),
  );

/**
 * Builds the plugin in `dir` with the Vite and `composerPlugin` the project installs, in this process — `vite build`
 * with the project's `vite.config.*`, or `composerPlugin` alone into `outDir` when it has none. The compiled `dx` does
 * not carry Vite, so it is loaded from the project, which also keeps the build on the project's own Vite version.
 */
export const buildInProcess = Effect.fnUntraced(function* ({
  dir,
  outDir,
  env,
}: {
  dir: string;
  outDir: string;
  env: Readonly<Record<string, string>>;
}) {
  const vite: typeof Vite = yield* importFrom(dir, 'vite');
  const hasViteConfig = VITE_CONFIG_FILES.some((file) => existsSync(join(dir, file)));
  // `composerPlugin` reads `dx.config.ts` and the EDGE host entry from the working directory and environment.
  yield* withProcessScope(
    dir,
    env,
    Effect.gen(function* () {
      let config: Vite.InlineConfig = { root: dir };
      if (!hasViteConfig) {
        const { composerPlugin }: typeof VitePlugin = yield* importFrom(dir, '@dxos/app-framework/vite-plugin');
        config = { root: dir, configFile: false, plugins: composerPlugin(), build: { outDir, emptyOutDir: true } };
      }
      yield* Effect.tryPromise({
        try: () => vite.build(config),
        catch: (error) => new PublishError({ message: 'Vite build failed.', context: { dir }, cause: error }),
      });
    }),
  );
});
