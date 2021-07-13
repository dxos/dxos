/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { firefox, Page } from 'playwright';

import { Browser } from './utils';

const INVITATION_REGEX = /swarmKey/g;

const createParty = async (page: Page) => {
  const haloButtonSelector = '//span[text()=\'Create Party\']';
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

  await page!.click('//span[text()=\'Copy invite\']');
  await invitationPromise;

  expect(invitationText!).toBeDefined();
  return invitationText!;
};

const createItem = async (page: Page): Promise<string> => {
  const itemName = `${Math.random().toString().slice(5)}`;
  await page.click('.MuiFab-root'); // The 'Add" fab button
  await page.fill('#item-dialog-item-name', itemName);
  await page.click('//span[text()=\'Create\']');
  return itemName;
};

// eslint-disable-next-line jest/valid-describe
describe('Demo - Primary and Peers', async function () {
  this.timeout(30000);
  this.retries(1);
  const browser = firefox;
  const primaryUrl = 'http://localhost:9001/iframe.html?id=demo--primary&viewMode=story';
  const peersUrl = 'http://localhost:9001/iframe.html?id=demo--peers&viewMode=story';
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

  it('Primary - item creation', async () => {
    await alice.page!.goto(primaryUrl);
    const itemName = await createItem(alice.page!);
    await alice.page!.waitForSelector(`//span[text()='${itemName}']`);
  });

  it('Peers - Alice creates a party', async () => {
    expect(alice.page).toBeDefined();
    await alice.page!.goto(peersUrl);
    await createParty(alice.page!);

    await alice.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');
  });

  it('Peers - Alice invites Bob to a party', async () => {
    await alice.page!.goto(peersUrl);
    await createParty(alice.page!);
    const invitationFromAlice = await createInvitation(alice.page!);

    await bob.page!.goto(peersUrl);
    await bob.page!.fill('#start-dialog-invitation-input', invitationFromAlice);
    await bob.page!.click('//span[text()=\'Join Party\']');

    await bob.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');
  });

  it('Peers - Replication in party', async () => {
    await alice.page!.goto(peersUrl);
    await createParty(alice.page!);
    const invitationFromAlice = await createInvitation(alice.page!);

    await bob.page!.goto(peersUrl);
    await bob.page!.fill('#start-dialog-invitation-input', invitationFromAlice);
    await bob.page!.click('//span[text()=\'Join Party\']');

    await bob.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');

    // Bob creates an item..
    const itemName = await createItem(bob.page!);

    // ..item gets replicated over to Alice.
    await alice.page!.waitForSelector(`//span[text()='${itemName}']`);
  });
});
