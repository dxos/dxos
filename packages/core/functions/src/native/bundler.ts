//
// Copyright 2025 DXOS.org
//

import { writeFile } from 'node:fs/promises';
import * as fs from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Record from 'effect/Record';
import { type Message, build } from 'esbuild';

import { BaseError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';

type BundleOptions = {
  entryPoint: string;
  verbose?: boolean;
};

type BundleResult = {
  entryPoint: string;
  assets: Record<string, Uint8Array>;
};

/**
 * Bundles a function.
 * Pulls in node_modules and wasm files.
 */
export const bundleFunction = async (options: BundleOptions): Promise<BundleResult> => {
  const outdir = `/tmp/dxos-functions-bundle-${new Date().toISOString()}-${PublicKey.random().toHex()}`;

  const result = await build({
    entryPoints: {
      // Gets mapped to `userFunc.js` by esbuild.
      userFunc: options.entryPoint,
    },
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
  });

  if (result.errors.length > 0) {
    throw new BundleCreationError(result.errors);
  }

  const assetPaths = Object.keys(result.metafile!.outputs).map((path) => relative(outdir, path));
  const assets = Function.pipe(
    await Promise.all(assetPaths.map((path) => fs.readFile(join(outdir, path)))),
    Array.zipWith(assetPaths, (content, path) => [path, content] as const),
    Record.fromEntries,
  );

  if (options.verbose) {
    console.log('Function compiled');
    console.log('Metafile path:', `${outdir}/metafile.json`);
    console.log('Assets:\n');
    console.log(
      Object.entries(result.metafile!.outputs)
        .sort((a, b) => b[1].bytes - a[1].bytes)
        .map(
          ([path, desc]) =>
            `${formatBytes(desc.bytes).padEnd(10)} - ${relative(outdir, path)} ${basename(path) === 'userFunc.js' ? ' (entry point)' : ''}`,
        )
        .join('\n'),
    );
  }

  // Must match esbuild entry point.
  return { entryPoint: 'userFunc.js', assets };
};

class BundleCreationError extends BaseError.extend('BUNDLE_CREATION_ERROR', 'Bundle creation failed') {
  constructor(errors: Message[]) {
    super({ context: { errors } });
  }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
};
