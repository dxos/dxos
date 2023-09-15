//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe('Bare Template', () => {
  test('is created', async () => {
    const packageJson = JSON.parse(await readFile('tmp/package.json', 'utf8'));
    expect(packageJson.name).toBe('tmp');
  });

  test('runs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('p');
    expect(await page.innerText('p')).toBe('Your code goes here');
  });
});
