/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox } from 'playwright';

import { Browser } from './utils';

describe('ClientInitializer', () => {
  const browser = firefox;
  const memoryUrl = 'http://localhost:9001/iframe.html?id=components-clientinitializer--memory&viewMode=story';
  // const persistentUrl = 'http://localhost:9001/iframe.html?id=components-clientinitializer--persistent&viewMode=story';
  let alice: Browser;
  let bob: Browser;

  before(async function () {
    this.timeout(30000);
    alice = new Browser();
    bob = new Browser();
    await alice.launchBrowser(browser, 'about:blank');
    await bob.launchBrowser(browser, 'about:blank');
  });

  after(async () => {
    await alice.closeBrowser();
    await bob.closeBrowser();
  });

  it('Profile creation and party creation', async () => {
    await alice.page!.goto(memoryUrl);
    await alice.page!.click('//span[text()=\'Create profile\']');
  });
});
