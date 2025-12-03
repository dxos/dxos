//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schedule from 'effect/Schedule';
import { type Loader, type Plugin } from 'esbuild';

import { runAndForwardErrors } from '@dxos/effect';
import { BaseError } from '@dxos/errors';

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1_000;

export class HttpPluginError extends BaseError.extend('HTTP_PLUGIN_ERROR') {}

const LOADERS: Record<string, Loader> = {
  js: 'js',
  jsx: 'jsx',
  ts: 'ts',
  tsx: 'tsx',
  wasm: 'copy',
} as const;

export const httpPlugin: Plugin = {
  name: 'http',
  setup: (build) => {
    // Intercept import paths starting with "http:" and "https:" so esbuild doesn't attempt to map them to a file system location.
    // Tag them with the "http-url" namespace to associate them with this plugin.
    build.onResolve({ filter: /^https?:\/\// }, (args) => ({
      path: args.path,
      namespace: 'http-url',
    }));

    // We also want to intercept all import paths inside downloaded files and resolve them against the original URL.
    // All of these files will be in the "http-url" namespace.
    // Make sure to keep the newly resolved URL in the "http-url" namespace so imports inside it will also be resolved as URLs recursively.
    build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({
      path: new URL(args.path, args.importer).toString(),
      namespace: 'http-url',
    }));

    // When a URL is loaded, we want to actually download the content from the internet.
    // This has just enough logic to be able to handle the example import from unpkg.com but in reality this would probably need to be more complex.
    build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
      return Effect.gen(function* () {
        const response = yield* HttpClient.get(args.path);
        if (response.status !== 200) {
          yield* Effect.fail(
            new HttpPluginError({
              message: `failed to fetch ${args.path}, status: ${response.status}`,
            }),
          );
        }

        const contents = new Uint8Array(yield* response.arrayBuffer);
        const extension = new URL(args.path).pathname.split('.').pop() || '';
        const loader = LOADERS[extension.toLowerCase()] ?? 'jsx';
        return { contents, loader };
      }).pipe(
        Effect.retry(
          Function.pipe(
            Schedule.exponential(Duration.millis(INITIAL_DELAY)),
            Schedule.jittered,
            Schedule.intersect(Schedule.recurs(MAX_RETRIES - 1)),
          ),
        ),
        Effect.provide(FetchHttpClient.layer),
        runAndForwardErrors,
      );
    });
  },
};
