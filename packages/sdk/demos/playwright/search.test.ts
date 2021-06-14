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

describe.only('Peers - invitations and replication', () => {
  const browser = firefox;
  const url = 'http://localhost:9001/iframe.html?id=demo--peers&viewMode=story';
  let alice: Browser;
  let bob: Browser;

  beforeAll(async () => {
    jest.setTimeout(30000);
    alice = new Browser();
    bob = new Browser();
    await alice.launchBrowser(browser, url);
    await bob.launchBrowser(browser, url);
  });

  afterAll(async () => {
    await alice.closeBrowser();
    await bob.closeBrowser();
  });

  test('Alice creates a party', async () => {
    expect(alice.page).toBeDefined();
    await alice.page!.goto(url);
    await createParty(alice.page!)

    await alice.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');
  });
});
