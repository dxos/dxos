import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';

test('probe: does rename apply?', async ({ browser }) => {
  const host = new AppManager(browser, true);
  await host.init();
  await host.createSpace();
  await host.toggleSection('spacePlugin.collectionsSection');
  await host.createObject({ type: 'Collection' });
  await expect(host.getObjectLinks()).toHaveCount(1);
  await host.renameObject('Renamed A', 0);
  await host.page.waitForTimeout(2000);
  // eslint-disable-next-line no-console
  console.log('PROBE labels:', JSON.stringify(await host.getObjectLinks().allInnerTexts()));
});
