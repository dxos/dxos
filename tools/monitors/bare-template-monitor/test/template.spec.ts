//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { Trigger } from '@dxos/async';

test.describe('Bare Template', () => {
  test('is created', async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Not browser-based, just run once.');

    const packageJson = JSON.parse(await readFile('tmp/package.json', 'utf8'));
    expect(packageJson.name).toBe('tmp');
  });

  test('builds', async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Not browser-based, just run once.');
    test.slow();

    const child = await exec('npm run build', { cwd: 'tmp' });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);

    const status = new Trigger<number | null>();
    child.on('exit', (code) => {
      status.wake(code);
    });
    expect(await status.wait()).toBe(0);
  });

  test('runs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('p');
    expect(await page.innerText('p')).toBe('Your code goes here');
  });
});
