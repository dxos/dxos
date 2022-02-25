//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Launcher } from '../util';

const config = {
  // esbuild-server book
  baseUrl: 'http://localhost:8080/#/'
};

const baseUrl = `${config.baseUrl}__story/stories-playwright-Sanity-stories-tsx`;

describe('Sanity test.', function () {
  this.timeout(30000);
  this.retries(0);

  let launcher: Launcher;

  before(async () => {
    launcher = new Launcher(baseUrl);
    await launcher.open();
  });

  after(async () => {
    await launcher.close();
  });

  it('Starts the test', async () => {
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
