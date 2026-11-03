//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { PLUGIN_HOST_ENTRY_ENV, PLUGIN_HOST_SPECIFIER } from '@dxos/app-framework/vite-plugin/config';
import * as BundleDescriber from '@dxos/plugin-registry/BundleDescriber';

/** The package that checks a bundle before it is published; its `check-bundle` runs in a subprocess. */
const PLUGIN_BUILDER = '@dxos/plugin-builder';

/** The installed `name` package directory nearest `dir`, as the plugin's build resolves it. */
const findPackage = (dir: string, name: string): string | undefined => {
  for (let current = dir; ; current = dirname(current)) {
    const packageDir = join(current, 'node_modules', name);
    if (existsSync(join(packageDir, 'package.json'))) {
      return packageDir;
    }
    if (dirname(current) === current) {
      return undefined;
    }
  }
};

/**
 * The entry of `name` when this CLI runs from a dxos checkout; `undefined` in the compiled binary, whose embedded files
 * a plugin's build cannot read.
 */
const checkoutEntry = (name: string): string | undefined => {
  try {
    const path = fileURLToPath(import.meta.resolve(name));
    return existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
};

/** The `name` package directory of a dxos checkout, from its resolved entry (`<package>/dist/lib/index.mjs`). */
const checkoutPackage = (name: string): string | undefined => {
  const entry = checkoutEntry(name);
  if (!entry) {
    return undefined;
  }
  for (let current = dirname(entry); dirname(current) !== current; current = dirname(current)) {
    if (existsSync(join(current, 'package.json'))) {
      if (JSON.parse(readFileSync(join(current, 'package.json'), 'utf8')).name === name) {
        return current;
      }
    }
  }
  return undefined;
};

/**
 * Checks a bundle with the `check-bundle` of the `@dxos/plugin-builder` the plugin installs, in a subprocess as the
 * build runs: the compiled `dx` cannot carry Vite, esbuild or workerd. A plugin without the builder is checked by EDGE
 * alone, which runs `describe()` on every upload before storing it.
 */
export const bundleDescriberLayer = Layer.succeed(BundleDescriber.Service, {
  buildEnv: Effect.sync((): Record<string, string> => {
    const hostEntry = checkoutEntry(PLUGIN_HOST_SPECIFIER);
    return hostEntry ? { [PLUGIN_HOST_ENTRY_ENV]: hostEntry } : {};
  }),
  describe: (dir) =>
    Effect.gen(function* () {
      const builderDir = findPackage(dir, PLUGIN_BUILDER) ?? checkoutPackage(PLUGIN_BUILDER);
      if (!builderDir) {
        return `not checked locally (${PLUGIN_BUILDER} is not installed); EDGE describes the bundle on upload`;
      }
      const checker = join(builderDir, 'dist/lib/bin/check-bundle.mjs');
      const { stdout } = yield* Effect.tryPromise({
        try: () => promisify(execFile)('node', [checker, dir], { maxBuffer: 16 * 1024 * 1024 }),
        // `check-bundle` prints each problem on stderr, which is the whole diagnosis.
        catch: (error) =>
          new BundleDescriber.DescribeError({
            message: `${dir} would not run on EDGE:\n${error instanceof Error && 'stderr' in error ? String(error.stderr) : String(error)}`,
          }),
      });
      return stdout.trim().split('\n').at(-1) ?? '';
    }),
});
