//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe('Hello Template', () => {
  test('is created', async () => {
    const packageJson = JSON.parse(await readFile('tmp/package.json', 'utf8'));
    expect(packageJson.name).toBe('tmp');
  });

  test('runs', async ({ page }) => {
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
    expect(await counter2.innerText()).toBe('Clicked 3 times');
    await counter2.click();
    expect(await counter.innerText()).toBe('Clicked 4 times');
  });
});
