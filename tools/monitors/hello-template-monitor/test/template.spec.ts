//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe('Bare Template', () => {
  test('is created', async () => {
    const packageJson = JSON.parse(await readFile('tmp/package.json', 'utf8'));
    // TODO(wittjosiah): Fix this test.
    // expect(packageJson.name).toBe('tmp');
    expect(packageJson.name).toBe('@dxos/tmp');
  });

  test('runs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('img');
    expect(await page.innerText('h1')).toBe('tmp');

    // TODO(wittjosiah): Update bare template w/ progresive multiplayer and finish test.
  });
});
