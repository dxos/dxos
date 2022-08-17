//
// Copyright 2022 DXOS.org
//

import { expect, test } from '@playwright/test';

import { Launcher } from '../util';

const config = {
  // esbuild-server book
  baseUrl: 'http://localhost:8080/#/'
};

const baseUrl = `${config.baseUrl}__story/stories-playwright-Sanity-stories-tsx`;

test.describe('Sanity test.', () => {
  let launcher: Launcher;

  test.beforeAll(async () => {
    launcher = new Launcher(baseUrl);
    await launcher.open();
  });

  test.afterAll(async () => {
    await launcher.close();
  });

  test('Starts the test', async () => {
    const page = await launcher.browser.newPage();
    await page.goto(launcher.url('/Primary'));

    const value = 'sanity test';
    const input = await page.locator('input[data-id="test-input"]');
    await input.type(value);

    const button = await page.locator('button[data-id="test-button"]');
    await button.click();

    const pre = await page.locator('pre[data-id="test-value"]');
    const text = await pre.innerText();
    expect(JSON.parse(text)).toStrictEqual({ value });
  });
});
