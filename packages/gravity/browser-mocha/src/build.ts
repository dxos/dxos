//
// Copyright 2021 DXOS.org
//

import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { build } from 'esbuild';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin } from '@dxos/esbuild-plugins';

export async function buildTests (files: string[], outDir: string) {
  const mainFile = join(outDir, 'main.js');
  const mainContents = `
    import { mocha } from 'mocha';

    mocha.reporter('spec');
    mocha.setup('bdd');
    mocha.checkLeaks();

    ${files.map(file => `require("${resolve(file)}");`).join('\n')}
    
    mocha.run(window.testsDone);
  `;

  await fs.writeFile(mainFile, mainContents);

  await build({
    entryPoints: [mainFile],
    write: true,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: 'inline',
    outfile: join(outDir, 'bundle.js'),
    plugins: [
      NodeModulesPolyfillPlugin(),
      NodeGlobalsPolyfillPlugin(),
      FixMemdownPlugin(),
      FixGracefulFsPlugin()
    ]
  });
}
