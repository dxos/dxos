//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Record from 'effect/Record';
import type { Plugin } from 'esbuild';

// TODO(dmaretskyi): Haven't managed to get this working.
export const PluginEmbeddedVendoredPackages = (): Plugin => ({
  name: 'embedded-vendored-packages',
  setup: (build) => {
    // // https://vite.dev/guide/features#custom-queries
    const moduleUrls = Function.pipe(
      // NOTE: Vite-specific API.
      // @ts-expect-error
      import.meta.glob('../../dist/vendor/**/*.js', {
        query: '?url',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
      Record.mapKeys((s) => s.replace('../../dist/vendor/', '').replace(/\.js$/, '')),
      Record.filter((_, key) => !key.startsWith('internal/')),
    );

    // console.log(moduleUrls);

    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point') {
        return;
      }

      return build.resolve(new URL(moduleUrls[args.path], import.meta.url).href, {
        kind: args.kind,
        resolveDir: args.resolveDir,
      });
    });
  },
});
