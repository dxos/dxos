//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import waitForExpect from 'wait-for-expect';

test.describe('Hello Template', () => {
  test('is created', async () => {
    const packageJson = JSON.parse(await readFile('tmp/package.json', 'utf8'));
    expect(packageJson.name).toBe('tmp');
  });

  test('runs', async ({ browserName, page }) => {
    // Page loads.
    await page.goto('/');
    await page.waitForSelector('img');
    expect(await page.innerText('h1')).toBe('tmp');

    // Counter increments.
    const counter = await page.getByTestId('counter');
    expect(await counter.innerText()).toBe('Click me!');
    await counter.click();
    expect(await counter.innerText()).toBe('Clicked 1 times');
    await counter.click();
    await counter.click();
    expect(await counter.innerText()).toBe('Clicked 3 times');

    // Counter syncs across tabs.
    const page2 = await page.context().newPage();
    await page2.goto('/');
    await page2.waitForSelector('img');
    const counter2 = await page2.getByTestId('counter');
    // TODO(wittjosiah): Webkit requires extra time to see 3 here.
    await waitForExpect(async () => {
      expect(await counter2.innerText()).toBe('Clicked 3 times');
    });
    await counter2.click();

    // Webkit doesn't support vault.
    if (browserName === 'webkit') {
      return;
    }

    // Wait for replication.
    await waitForExpect(async () => {
      expect(await counter.innerText()).toBe('Clicked 4 times');
    });
  });
});
