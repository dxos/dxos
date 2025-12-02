//
// Copyright 2025 DXOS.org
//

import type { Plugin } from 'esbuild';

/*

script-vendored-packages bucket on R2

https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/r2/default/buckets/script-vendored-packages/settings

'https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev/dev' -- last portion is the env

 
*/

const DEFAULT_SCRIPT_PACKAGES_BUCKET = 'https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev/dev';

export const PluginR2VendoredPackages = ({ url = DEFAULT_SCRIPT_PACKAGES_BUCKET }: { url?: string } = {}): Plugin => ({
  name: 'r2-vendored-packages',
  setup: (build) => {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point') {
        return;
      }

      return {
        path: new URL(`/${args.path}.js`, url).href,
        namespace: 'http-url', // Uses http plugin.
      };
    });
  },
});
