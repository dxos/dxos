import { randomBytes } from 'crypto';
import { build } from 'esbuild';
import glob from 'glob'
import { join } from 'path';
import { chromium } from 'playwright';
import { promisify } from 'util';
import pkgUp from 'pkg-up'
import assert from 'assert';

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
  const packageDir = await pkgUp({ cwd: __dirname })
  assert(packageDir)
  const tempDir = '../../out'; // `/tmp/browser-mocha-${randomBytes(32).toString('hex')}`

  const files = await resolveFiles(options.files);
  const res = await build({
    entryPoints: files,
    write: true,
    bundle: true,
    platform: 'browser',
    splitting: true,
    format: 'esm',
    outdir: tempDir,
    metafile: true,
  })

  console.log(res.metafile)

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`file://${join(__dirname, './index.html')}`)

  for(const [name, output] of Object.entries(res.metafile!.outputs)) {
    if(!output.entryPoint) {
      continue
    }
    page.addScriptTag({
      path: join(tempDir, name)
    })
  }
  
}

async function resolveFiles(globs: string[]): Promise<string[]> {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)))
  return Array.from(new Set(results.flat(1)));
}
