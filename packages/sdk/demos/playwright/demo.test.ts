/* eslint-disable jest/expect-expect, @typescript-eslint/no-unused-vars */
//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { firefox, Page } from 'playwright';

import { Browser } from './utils';

const INVITATION_REGEX = /swarmKey/g;
const BASE_URL = 'http://localhost:8080/#/';

const createParty = async (page: Page) => {
  const haloButtonSelector = 'button:has-text("Create Party")';
  await page.waitForSelector(haloButtonSelector);
  await page.click(haloButtonSelector);
};

const createInvitation = async (page: Page): Promise<string> => {
  let invitationText: string;
  const invitationPromise = page.waitForEvent('console', message => {
    if (message.text().match(INVITATION_REGEX)) {
      invitationText = message.text();
      return true;
    }
    return false;
  });

  await page!.click('button:has-text("Copy invite")');
  await invitationPromise;

  expect(invitationText!).toBeDefined();
  return invitationText!;
};

const createItem = async (page: Page): Promise<string> => {
  const itemName = `${Math.random().toString().slice(5)}`;
  await page.click('.MuiFab-root'); // The 'Add' fab button.
  await page.fill('#item-dialog-item-name', itemName);
  await page.click('button:has-text("Create")');
  return itemName;
};

// eslint-disable-next-line jest/valid-describe
describe('Demo - Primary and Peers', async function () {
  this.timeout(30000);
  this.retries(0);
  const browser = firefox;
  const primaryUrl = `${BASE_URL}__story/stories-demo-index-story-tsx/Primary`;
  const peersUrl = `${BASE_URL}__story/stories-demo-index-story-tsx/Peers`;
  let alice: Browser;
  let bob: Browser;

  before(async () => {
    alice = new Browser();
    bob = new Browser();
    await alice.launchBrowser(browser, 'about:blank');
    await bob.launchBrowser(browser, 'about:blank');
  });

  after(async () => {
    await alice.closeBrowser();
    await bob.closeBrowser();
  });

  // TODO(rzadp): Add cases for HALO invitations and Party invitations.
});
