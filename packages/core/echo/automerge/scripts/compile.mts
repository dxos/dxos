import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

for (const platform of ['node', 'browser'] as const) {
  const result = await build({
    entryPoints:
      platform === 'node'
        ? ['src/automerge.ts', 'src/automerge/next.ts', 'src/automerge-repo.ts']
        : {
            'automerge_wasm_bg': join(
              dirname(await require.resolve('@automerge/automerge-wasm')),
              '../bundler/automerge_wasm_bg.js',
            ),
            'automerge-wasm': 'src/automerge-wasm.ts',
            'automerge': 'src/automerge.ts',
            'automerge/next': 'src/automerge/next.ts',
            'automerge-repo': 'src/automerge-repo.ts',
          },
    bundle: true,
    format: 'esm',
    platform: platform,
    outdir: `dist/lib/${platform}`,
    splitting: true,
    outExtension: { '.js': platform === 'node' ? '.cjs' : '.js' },
    metafile: true,
    plugins: [
      {
        name: 'external-deps',
        setup: (build) => {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.endsWith('.wasm')) {
              return {
                external: true,
                path: args.path + '?init',
              };
            }

            if (args.path.startsWith('@automerge/') && !args.importer.includes(join(process.cwd(), 'src'))) {
              return {
                external: true,
                path: args.path.replace('@automerge/', '#'),
              };
            }
          });
        },
      },
    ],
  });

  if (platform === 'node') {
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
          bundle: false,
          format: 'cjs',
          platform: 'node',
          sourcemap: 'linked',
          allowOverwrite: true,
        });
      }),
    );
  }
}

// await copyFile(
//   join(dirname(await require.resolve('@automerge/automerge-wasm')), './automerge_wasm_bg.wasm'),
//   'dist/lib/node/automerge_wasm_bg.wasm'
// )

await copyFile(
  join(dirname(await require.resolve('@automerge/automerge-wasm')), '../bundler/automerge_wasm_bg.wasm'),
  'dist/lib/browser/automerge_wasm_bg.wasm',
);
