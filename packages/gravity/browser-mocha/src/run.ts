//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { dirname, join } from 'path';
import pkgUp from 'pkg-up';
import { chromium } from 'playwright';

import { Lock, trigger } from '@dxos/async';

export async function runTests (bundleFile: string, show: boolean): Promise<number> {
  const browser = await chromium.launch({
    headless: !show,
    args: [
      '--disable-web-security'
    ]
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const lock = new Lock();

  page.on('console', async msg => {
    const argsPromise = Promise.all(msg.args().map(x => x.jsonValue()));
    await lock.executeSynchronized(async () => {
      const args = await argsPromise;
      if (args.length > 0) {
        console.log(...args);
      } else {
        console.log(msg);
      }
    });
  });

  const packageDir = dirname(await pkgUp({ cwd: __dirname }) as string);
  assert(packageDir);

  await page.goto(`file://${join(packageDir, './src/index.html')}`);

  const [getPromise, resolve] = trigger<number>();
  await page.exposeFunction('testsDone', async (exitCode: number) => {
    await lock.executeSynchronized(async () => {
      resolve(exitCode);
    });
  });

  await page.addScriptTag({
    path: bundleFile
  });

  return getPromise();
}
