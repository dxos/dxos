//
// Copyright 2025 DXOS.org
//

import type * as PlatformError from '@effect/platform/Error';
import type * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import { type Message } from 'esbuild';

import { BaseError } from '@dxos/errors';
import { bundleFunction } from '@dxos/functions-runtime/native';

import { CommandConfig } from '../../../../services';

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
) => Effect.Effect<
  BundleResult,
  BundleCreationError | PlatformError.PlatformError,
  FileSystem.FileSystem | CommandConfig
> = Effect.fn(function* (options) {
  const { verbose } = yield* CommandConfig;
  return yield* Effect.promise(() =>
    bundleFunction({
      entryPoint: options.entryPoint,
      verbose,
    }),
  );
});

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
