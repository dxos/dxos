/* eslint-disable jest/expect-expect, @typescript-eslint/no-unused-vars */
//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { firefox, Page } from 'playwright';

import { sleep } from '@dxos/async';

import { Browser } from './utils';

const INVITATION_REGEX = /encodedInvitation/g;
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

const joinInvitation = async (page: Page, invitation: string) => {
  await page.fill('#start-dialog-invitation-input', invitation);
  await sleep(100);
  await page.click('//button[text()=\'Join Party\']');
};

const createItem = async (page: Page): Promise<string> => {
  const itemName = `${Math.random().toString().slice(5)}`;
  await page.click('.MuiFab-root'); // The 'Add' fab button.
  await page.fill('#item-dialog-item-name', itemName);
  await page.click('button:has-text("Create")');
  return itemName;
};

describe('Demo - Primary and Peers', function () {
  this.timeout(30000);
  this.retries(0);
  const browser = firefox;
  const peersUrl = `${BASE_URL}__story/stories-views-stories-tsx/Peers`;
  let alice: Browser;
  let bob: Browser;

  before(async () => {
    alice = new Browser();
    bob = new Browser();
    await alice.launchBrowser(browser, peersUrl);
    await bob.launchBrowser(browser, peersUrl);
  });

  after(async () => {
    await alice.closeBrowser();
    await bob.closeBrowser();
  });

  it('Peers storybook with Party invitations', async () => {
    await createParty(alice.page!);
    const itemName = await createItem(alice.page!);
    const invitation = await createInvitation(alice.page!);

    await joinInvitation(bob.page!, invitation);
    await bob.page!.waitForSelector(`span:has-text("${itemName}")`);
  });
});
