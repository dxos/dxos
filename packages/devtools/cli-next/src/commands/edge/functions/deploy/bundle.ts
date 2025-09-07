//
// Copyright 2025 DXOS.org
//

import { writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

import { FileSystem } from '@effect/platform';
import { type PlatformError } from '@effect/platform/Error';
import { Array, Effect } from 'effect';
import { type Message, build } from 'esbuild';

import { BaseError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { invariant } from '@dxos/invariant';

type BundleOptions = {
  entryPoint: string;
};

type BundleResult = {
  entryPoint: string;
  assets: Record<string, Uint8Array>;
};

// NOTE: This is not using the Bundler from @dxos/functions due to different needs.
//  This is written for writing to the filesystem with node apis whereas the Bundler is written to work in the browser.
export const bundle: (
  options: BundleOptions,
) => Effect.Effect<BundleResult, BundleCreationError | PlatformError, FileSystem.FileSystem> = Effect.fn(
  function* (options) {
    const outdir = `/tmp/dxos-functions-bundle-${new Date().toISOString()}-${PublicKey.random().toHex()}`;

    const result = yield* Effect.promise(() =>
      build({
        entryPoints: [options.entryPoint],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        conditions: ['workerd', 'worker', 'browser'],
        outdir,
        metafile: true,
        treeShaking: true,
        splitting: true,
        loader: {
          '.wasm': 'copy',
        },
        external: [
          'cloudflare:workers',
          'functions-service:user-script',
          'node:async_hooks',
          'node:buffer',
          'node:crypto',
          'node:diagnostics_channel',
          'node:events',
        ],
        plugins: [
          {
            name: 'metafile',
            setup: (build) => {
              build.onEnd(async (result) => {
                await writeFile(
                  join(build.initialOptions.outdir!, 'metafile.json'),
                  JSON.stringify(result.metafile, null, 2),
                );
                await writeFile(
                  join(build.initialOptions.outdir!, 'manifest.json'),
                  JSON.stringify(
                    {
                      files: Object.keys(result.metafile!.outputs).map((path) => ({
                        name: relative(build.initialOptions.outdir!, path),
                      })),
                    },
                    null,
                    2,
                  ),
                );
              });
            },
          },
        ],
      }),
    );

    if (result.errors.length > 0) {
      return yield* Effect.fail(new BundleCreationError(result.errors));
    }

    const fs = yield* FileSystem.FileSystem;
    const assetPaths = Object.keys(result.metafile!.outputs).map((path) => relative(outdir, path));
    const assets = yield* Effect.all(assetPaths.map((path) => fs.readFile(join(outdir, path)))).pipe(
      Effect.map((assets) => Array.zip(assetPaths, assets)),
      Effect.map((assets) => Object.fromEntries(assets)),
    );
    const entryPointPath = Object.entries(result.metafile!.outputs).find(([path, desc]) => !!desc.entryPoint)?.[0];
    invariant(entryPointPath, 'Entry point not found');
    const entryPoint = basename(entryPointPath);
    return { entryPoint, assets };
  },
);

class BundleCreationError extends BaseError.extend('BUNDLE_CREATION_ERROR') {
  constructor(errors: Message[]) {
    super('Bundle creation failed', { context: { errors } });
  }
}
