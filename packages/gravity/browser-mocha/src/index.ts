import { randomBytes } from 'crypto';
import { build } from 'esbuild';
import glob from 'glob'
import { dirname, join, resolve } from 'path';
import { chromium } from 'playwright';
import { promisify } from 'util';
import pkgUp from 'pkg-up'
import assert from 'assert';
import { promises as fs } from 'fs';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin } from '@dxos/esbuild-plugins'

export enum Browser {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

export interface RunOptions {
  /**
   * Globs to look for files.
   */
  files: string[]
  browsers: Browser[]
}

export async function run(options: RunOptions) {
  const packageDir = dirname(await pkgUp({ cwd: __dirname }) as string)
  assert(packageDir)
  const tempDir = join(__dirname, '../../out'); // `/tmp/browser-mocha-${randomBytes(32).toString('hex')}`

  const files = await resolveFiles(options.files);

  const mainFile = join(tempDir, 'main.js');
  const mainContents = `
    import { mocha } from 'mocha';

    mocha.reporter('spec');
    mocha.setup('bdd');
    mocha.checkLeaks();

    ${files.map(file => `require("${resolve(file)}");`).join('\n')}
    
    mocha.run();
  `


  await fs.writeFile(mainFile, mainContents)

  const res = await build({
    entryPoints: [mainFile],
    write: true,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: join(tempDir, 'bundle.js'),
    plugins: [
      NodeModulesPolyfillPlugin(),
      NodeGlobalsPolyfillPlugin(),
      FixMemdownPlugin(),
      FixGracefulFsPlugin(),
    ],
  })

  const browser = await chromium.launch({
    args: [
      '--disable-web-security',
    ], 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // TODO(marik-d): Ensure log ordering.
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(x => x.jsonValue()))
    console.log(...args)
  })

  await page.goto(`file://${join(packageDir, './src/index.html')}`)

  await page.addScriptTag({
    path: join(tempDir, 'bundle.js'),
  })
}

async function resolveFiles(globs: string[]): Promise<string[]> {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)))
  return Array.from(new Set(results.flat(1)));
}
