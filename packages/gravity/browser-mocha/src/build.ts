import { build } from 'esbuild';
import { join, resolve } from 'path';
import { promises as fs } from 'fs';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin } from '@dxos/esbuild-plugins'

export async function buildTests(files: string[], outDir: string) {
  const mainFile = join(outDir, 'main.js');
  const mainContents = `
    import { mocha } from 'mocha';

    mocha.reporter('spec');
    mocha.setup('bdd');
    mocha.checkLeaks();

    ${files.map(file => `require("${resolve(file)}");`).join('\n')}
    
    mocha.run(window.testsDone);
  `

  await fs.writeFile(mainFile, mainContents)

  await build({
    entryPoints: [mainFile],
    write: true,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: join(outDir, 'bundle.js'),
    plugins: [
      NodeModulesPolyfillPlugin(),
      NodeGlobalsPolyfillPlugin(),
      FixMemdownPlugin(),
      FixGracefulFsPlugin(),
    ],
  })
}
