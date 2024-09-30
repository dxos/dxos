import { build } from 'esbuild';
import { copyFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path, { dirname, join } from 'node:path';
// import { esbuildPlugin } from './wasm-esbuild-plugin.mjs';

const require = createRequire(import.meta.url);

const configurations = [
  {
    platform: 'node',
    entryPoints: [
      'src/automerge.ts',
      'src/automerge/next.ts',
      'src/automerge-repo.ts',
      'src/automerge-repo-storage-indexeddb.ts',
      'src/automerge-repo-network-broadcastchannel.ts',
      'src/automerge-repo-network-websocket.ts',
    ],
    outdir: 'dist/lib/node',
    outExtension: '.cjs',
    convertToCommonJS: true,
  },
  {
    platform: 'node',
    entryPoints: [
      'src/automerge.ts',
      'src/automerge/next.ts',
      'src/automerge-repo.ts',
      'src/automerge-repo-storage-indexeddb.ts',
      'src/automerge-repo-network-broadcastchannel.ts',
      'src/automerge-repo-network-websocket.ts',
    ],
    outdir: 'dist/lib/node-esm',
    outExtension: '.mjs',
    convertToCommonJS: false,
  },
  {
    platform: 'browser',
    entryPoints: {
      automerge: 'src/automerge.ts',
      'automerge/next': 'src/automerge/next.ts',
      'automerge-repo': 'src/automerge-repo.ts',
      'automerge-repo-storage-indexeddb': 'src/automerge-repo-storage-indexeddb.ts',
      'automerge-repo-network-broadcastchannel': 'src/automerge-repo-network-broadcastchannel.ts',
      'automerge-repo-network-websocket': 'src/automerge-repo-network-websocket.ts',
    },
    outdir: 'dist/lib/browser',
    outExtension: '.js',
    convertToCommonJS: false,
  },
] as const;

for (const config of configurations) {
  try {
    await rm(config.outdir, { recursive: true });
  } catch {}

  const result = await build({
    entryPoints: config.entryPoints as any,
    bundle: true,
    format: 'esm',
    platform: config.platform,
    outdir: config.outdir,
    splitting: true,
    outExtension: { '.js': config.outExtension },
    metafile: true,
    plugins: [
      // esbuildPlugin(),
      {
        name: 'external-deps',
        setup: (build) => {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.startsWith('@automerge/') && !args.importer.includes(join(process.cwd(), 'src'))) {
              return {
                external: true,
                path: args.path.replace('@automerge/', '#'),
              };
            }

            // TODO(mykola): Remove once shell `xstate` dependency is bumped to 5.9.0.
            // Bundles `xstate` with automerge code to avoid version conflicts.
            if (args.path.startsWith('xstate')) {
              return;
            }

            if (args.kind !== 'entry-point' && !args.path.startsWith('.') && !args.path.startsWith('@automerge/')) {
              return {
                external: true,
                path: args.path,
              };
            }
          });
        },
      },
    ],
  });

  if (config.convertToCommonJS) {
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

// bust cache
