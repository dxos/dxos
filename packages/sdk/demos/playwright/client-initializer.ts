/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox, Page } from 'playwright';

import { Browser } from './utils';

const INVITATION_REGEX = /swarmKey/g

const createParty = async (page: Page) => {
  const haloButtonSelector = '//span[text()=\'Create Party\']'
  await page.waitForSelector(haloButtonSelector);
  await page.click(haloButtonSelector);
}

const createInvitation = async (page: Page): Promise<string> => {
  let invitationText: string;
    const invitationPromise = page.waitForEvent('console', message => {
      if (message.text().match(INVITATION_REGEX)) {
        invitationText = message.text();
        return true;
      }
      return false;
    });

    await page!.click('//span[text()=\'Copy invite\']')
    await invitationPromise;

    expect(invitationText!).toBeDefined();
    return invitationText!
}

const createItem = async (page: Page): Promise<string> => {
  const itemName = `${Math.random().toString().slice(5)}`
  await page.click('.MuiFab-root'); // The 'Add" fab button
  await page.fill('#item-dialog-item-name', itemName)
  await page.click('//span[text()=\'Create\']');
  return itemName
}

describe('ClientInitializer', () => {
  const browser = firefox;
  const memoryUrl = 'http://localhost:9001/iframe.html?idcomponents-clientinitializer--memory&viewMode=story';
  const persistentUrl = 'http://localhost:9001/iframe.html?id=components-clientinitializer--persistent&viewMode=story';
  let alice: Browser;
  let bob: Browser;

  beforeAll(async () => {
    jest.setTimeout(30000);
    alice = new Browser();
    bob = new Browser();
    await alice.launchBrowser(browser, 'about:blank');
    await bob.launchBrowser(browser, 'about:blank');
  });

  afterAll(async () => {
    await alice.closeBrowser();
    await bob.closeBrowser();
  });

  test('Profile creation and party creation', async () => {
    await alice.page!.goto(memoryUrl);
    await alice.page!.click('//span[text()=\'Create profile\']')
  })

  test('Party creation', async () => {
  });

  test('Persistence', async () => {
  });

});
