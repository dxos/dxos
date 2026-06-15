//
// Copyright 2023 DXOS.org
//

import { type Plugin, build } from 'esbuild';

export const esmOutputToCjs = (): Plugin => ({
  name: 'esmOutputToCjs',
  setup: (pluginBuild) => {
    pluginBuild.onEnd(async (result) => {
      if (!result.metafile) {
        throw new Error('Missing metafile.');
      }
      const outFiles = Object.keys(result.metafile?.outputs ?? {});
      const jsFiles = outFiles.filter((f) => f.endsWith('js'));

      await Promise.all(
        jsFiles.map(async (file) => {
          await build({
            entryPoints: [file],
            outfile: file,
            format: 'cjs',
            platform: 'node',
            sourcemap: 'linked',
            allowOverwrite: true,
          });
        }),
      );
    });
  },
});
