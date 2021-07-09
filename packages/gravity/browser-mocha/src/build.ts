//
// Copyright 2021 DXOS.org
//

import { build } from 'esbuild';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

export async function buildTests (files: string[], outDir: string) {
  const mainFile = join(outDir, 'main.js');
  const mainContents = `
    import debug from 'debug';
    
    debug.enable('${process.env.DEBUG}');

    import { mocha } from 'mocha';

    mocha.reporter('spec');
    mocha.setup('bdd');
    mocha.checkLeaks();

    ${files.map(file => `require("${resolve(file)}");`).join('\n')}

    window.browserMocha__initFinished()
    
    mocha.run(window.browserMocha__testsDone);
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
      NodeModulesPlugin(),
      NodeGlobalsPolyfillPlugin(),
      FixMemdownPlugin(),
      FixGracefulFsPlugin()
    ]
  });
}
