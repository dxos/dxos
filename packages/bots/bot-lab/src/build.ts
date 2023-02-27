//
// Copyright 2023 DXOS.org
//

import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXTERNALIZED_PACKAGES = ['@koush/wrtc', 'sodium-universal', 'xsalsa20-universal'];

void (async () => {
  const ourdir = './dist/bot';

  try {
    await rm(ourdir, { recursive: true, force: true });
  } catch (err) {}

  await mkdir(ourdir, { recursive: true });

  const externalDeps: Record<string, string> = {};

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\BODY');

  await build({
    entryPoints: ['./src/main.ts'],
    bundle: true,
    outfile: join(ourdir, 'bundle.js'),
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'external-packages',
        setup: (build) => {
          EXTERNALIZED_PACKAGES.forEach((pkg) => {
            build.onResolve({ filter: new RegExp(`^${escapeRegExp(pkg)}`) }, (args) => {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const version = require(require.resolve(`${pkg}/package.json`, { paths: [args.resolveDir] })).version;
              externalDeps[pkg] = version;
              return { path: args.path, external: true };
            });
          });
        }
      }
    ]
  });

  await writeFile(
    join(ourdir, 'package.json'),
    JSON.stringify({
      name: 'dxos-bot',
      version: '0.0.1',
      description: 'DXOS Bot',
      dependencies: externalDeps
    })
  );

  console.log('external deps', externalDeps);
})();
