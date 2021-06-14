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

describe('Peers - invitations and replication', () => {
  const browser = firefox;
  const url = 'http://localhost:9001/iframe.html?id=demo--peers&viewMode=story';
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

  test('Alice creates a party', async () => {
    expect(alice.page).toBeDefined();
    await alice.page!.goto(url);
    await createParty(alice.page!)

    await alice.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');
  });

  test('Alice invites Bob to a party', async () => {
    await alice.page!.goto(url);
    await createParty(alice.page!)
    const invitationFromAlice = await createInvitation(alice.page!);
    
    await bob.page!.goto(url);
    await bob.page!.fill('#start-dialog-invitation-input', invitationFromAlice)
    await bob.page!.click('//span[text()=\'Join Party\']')

    await bob.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');
  });

  test('Replication in party', async () => {
    await alice.page!.goto(url);
    await createParty(alice.page!)
    const invitationFromAlice = await createInvitation(alice.page!);
    
    await bob.page!.goto(url);
    await bob.page!.fill('#start-dialog-invitation-input', invitationFromAlice)
    await bob.page!.click('//span[text()=\'Join Party\']')

    await bob.page!.waitForSelector('//span[text()=\'Koch - Macejkovic\']');
    
    // Bob creates an item..
    const itemName = `${Math.random().toString().slice(5)}`
    await bob.page!.click('.MuiFab-root'); // The 'Add" fab button
    await bob.page!.fill('#item-dialog-item-name', itemName)
    await bob.page!.click('//span[text()=\'Create\']');

    // ..item gets replicated over to Alice.
    await alice.page!.waitForSelector(`//span[text()='${itemName}']`)
  });
});
