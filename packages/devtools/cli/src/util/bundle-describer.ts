//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { fileURLToPath } from 'node:url';

import * as BundleDescriber from '@dxos/plugin-registry/BundleDescriber';

const describeError = (message: string) => (error: unknown) =>
  new BundleDescriber.DescribeError({ message, cause: error });

/**
 * Runs `describe()` with `@dxos/plugin-host-cloudflare`, which the build vendors into the bundle. Its modules (the
 * vite plugin, Miniflare, the parser) load only when a publish runs, not on every `dx` start.
 */
export const bundleDescriberLayer = Layer.succeed(BundleDescriber.Service, {
  buildEnv: Effect.tryPromise({
    try: async () => {
      const { PLUGIN_HOST_ENTRY_ENV } = await import('@dxos/app-framework/vite-plugin');
      return { [PLUGIN_HOST_ENTRY_ENV]: fileURLToPath(import.meta.resolve('@dxos/plugin-host-cloudflare')) };
    },
    catch: describeError('Cannot resolve the EDGE plugin host.'),
  }),
  describe: (dir) =>
    Effect.tryPromise({
      try: async () => {
        const { verifyBundle } = await import('@dxos/plugin-host-cloudflare/bundle');
        return verifyBundle(dir, { requireHost: true });
      },
      catch: describeError(`Cannot load ${dir} in workerd.`),
    }).pipe(
      Effect.flatMap(({ problems, summary }) =>
        problems.length === 0
          ? Effect.succeed(summary)
          : Effect.fail(
              new BundleDescriber.DescribeError({
                message: [
                  `${dir} would not run on EDGE:`,
                  ...problems.map(({ path, message }) => `  - ${path}: ${message}`),
                ].join('\n'),
              }),
            ),
      ),
    ),
});
