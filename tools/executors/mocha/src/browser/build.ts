//
// Copyright 2021 DXOS.org
//

import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

import {
  NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin, NodeModulesPlugin
} from '@dxos/esbuild-plugins';

export interface BuildTestsOpts {
  outDir: string
  debug: boolean
  checkLeaks: boolean
}

export const buildTests = async (files: string[], opts: BuildTestsOpts) => {
  const mainFile = join(opts.outDir, 'main.js');
  const mainContents = `
    import debug from 'debug';

    ${opts.debug ? 'debugger;' : ''}
    
    debug.enable('${process.env.DEBUG}');

    import { mocha } from 'mocha';

    async function run() {
      const context = await window.browserMocha__getEnv();

      window.mochaExecutor = { environment: context.browserType };

      mocha.reporter('spec');
      mocha.setup('bdd');
      ${opts.checkLeaks ? 'mocha.checkLeaks();' : ''}

      ${files.map(file => `require("${relative(opts.outDir, resolve(file))}");`).join('\n')}

      window.browserMocha__initFinished()
      
      mocha.run(window.browserMocha__testsDone);
    }

    run();
  `;

  await writeFile(mainFile, mainContents);

  await build({
    entryPoints: [mainFile],
    write: true,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: 'inline',
    outfile: join(opts.outDir, 'bundle.js'),
    plugins: [
      FixGracefulFsPlugin(),
      FixMemdownPlugin(),
      NodeGlobalsPolyfillPlugin(),
      NodeModulesPlugin()
    ]
  });
};
