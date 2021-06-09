/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox, Page } from 'playwright';

import { Browser } from './utils';

const createHalo = async (page: Page) => {
  const haloButtonSelector = '//span[text()=\'Create HALO\']'
  await page.waitForSelector(haloButtonSelector);
  await page.click(haloButtonSelector);
}

const createParty = async (page: Page) => {
  const haloButtonSelector = '//span[text()=\'Create Party\']'
  await page.waitForSelector(haloButtonSelector);
  await page.click(haloButtonSelector);
}

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

  test('Tutorials stage 1', async () => {
    expect(user.page).toBeDefined();
    await user.page!.goto(`${startUrl}/iframe.html?id=tutorials-stage-1--stage-1&viewMode=story`);
    await createHalo(user.page!)

    await user.page!.waitForSelector('//p[text()=\'username\']');
    await user.page!.waitForSelector('//p[text()=\'publicKey\']');
  });

  test('Tutorials stage 2', async () => {
    expect(user.page).toBeDefined();
    await user.page!.goto(`${startUrl}/iframe.html?id=tutorials-stage-2--stage-2&viewMode=story`);
    await createHalo(user.page!)
    await createParty(user.page!)
    await createParty(user.page!)
    await createParty(user.page!)

    await user.page!.waitForSelector('//li[text()=\'Rau - Sporer\']'); // deterministic thanks to faker seed.
  });

  test('Tutorials stage 3', async () => {
    expect(user.page).toBeDefined();
    await user.page!.goto(`${startUrl}/iframe.html?id=tutorials-stage-3--stage-3&viewMode=story`);
    await createHalo(user.page!)
    await createParty(user.page!)
    await user.page!.click('//span[text()=\'Create item\']')

    await user.page!.waitForSelector('//p[text()=\'Priscilla Stamm\']'); // deterministic thanks to faker seed.
  });
});
