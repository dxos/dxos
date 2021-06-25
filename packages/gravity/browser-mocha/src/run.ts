import { Lock } from '@dxos/async';
import assert from 'assert';
import { dirname, join } from 'path';
import pkgUp from 'pkg-up';
import { chromium } from 'playwright';

export function runTests(bundleFile: string): Promise<number> {
  return new Promise(async (resolve) => {
    const browser = await chromium.launch({
      args: [
        '--disable-web-security',
      ], 
    });
    const context = await browser.newContext();
    const page = await context.newPage();
  
    const lock = new Lock()
  
    page.on('console', async msg => {
      await lock.executeSynchronized(async () => {
        const args = await Promise.all(msg.args().map(x => x.jsonValue()))
        console.log(...args)
      })
    })

    const packageDir = dirname(await pkgUp({ cwd: __dirname }) as string)
    assert(packageDir)
  
    await page.goto(`file://${join(packageDir, './src/index.html')}`)
  
    await page.exposeFunction('testsDone', async (exitCode: number) => {
      await lock.executeSynchronized(async () => {
        resolve(exitCode)
      })
    })
  
    await page.addScriptTag({
      path: bundleFile,
    })
  })  
}
