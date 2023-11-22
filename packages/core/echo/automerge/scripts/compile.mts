import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

for(const platform of ['node', 'browser'] as const) {
  await build({
    entryPoints: [
      'src/automerge-wasm.ts',
      'src/automerge.ts',
      'src/automerge/next.ts',
      'src/automerge-repo.ts',
    ],
    bundle: true,
    format: 'esm',
    platform: platform,
    outdir: `dist/${platform}`,
    splitting: true,
    outExtension: { '.js': platform === 'node' ? '.cjs' : '.mjs' },
    metafile: true,
    plugins: [
      {
        name: 'external-deps',
        setup: build => {
        build.onResolve({ filter: /.*/ }, args => {
          if(args.path.endsWith('.wasm')) {
            return {
              external: true,
              path: args.path + '?init',
            }
          }

          if(args.path.startsWith('@automerge/') && !args.importer.includes(join(process.cwd(), 'src'))) {
            return {
              external: true,
              path: args.path.replace('@automerge/', '@dxos/automerge/')
            }
          }
        })
        }
      },
      {
        name: 'esmOutputToCjs',
        setup: (pluginBuild) => {
          if(platform !== 'node') return;
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
      }
    ]
  });
}

const require = createRequire(import.meta.url);

await copyFile(
  join(dirname(await require.resolve('@automerge/automerge-wasm')), './automerge_wasm_bg.wasm'),
  'dist/node/automerge_wasm_bg.wasm'
)

await copyFile(
  join(dirname(await require.resolve('@automerge/automerge-wasm')), '../bundler/automerge_wasm_bg.wasm'),
  'dist/browser/automerge_wasm_bg.wasm'
)