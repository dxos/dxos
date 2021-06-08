/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox } from 'playwright';

import { Browser } from './utils';

describe('Smoke tests for demo storybooks', () => {
  const browser = firefox;
  const startUrl = 'http://localhost:9001';
  let user: Browser;

  beforeAll(async () => {
    jest.setTimeout(30000);
    user = new Browser();
    await user.launchBrowser(browser, startUrl);
  });

  afterAll(async () => {
    await user.closeBrowser();
  });

  test('Opens the Tutorials stage 1', async () => {
    await user.page.goto(`${startUrl}/iframe.html?id=tutorials-stage-1--stage-1&viewMode=story`);
    await user.page.waitForSelector('//span[text()=\'Create HALO\']');
    await user.page.click('//span[text()=\'Create HALO\']');

    await user.page.waitForSelector('//p[text()=\'username\']');
    await user.page.waitForSelector('//p[text()=\'publicKey\']');
  });
});
