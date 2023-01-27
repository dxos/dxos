//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import { Page } from 'playwright';

import { beforeAll, describe, setupPage, test } from '@dxos/test';

// TODO(wittjosiah): Factor out.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

describe('Smoke test', function () {
  let page: Page;

  beforeAll(async function () {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
    if (mochaExecutor.environment === 'firefox') {
      return;
    }

    const result = await setupPage(this, {
      url: storybookUrl('react-client-clientcontext--primary'),
      waitFor: (page) => page.isVisible(':has-text("initialized")')
    });

    page = result.page;
  });

  // NOTE: This test depends on connecting to the default production deployed HALO vault.
  test('Renders remote client info', async () => {
    const isVisible = await page.isVisible(':has-text("initialized")');
    expect(isVisible).to.be.true;
  }).skipEnvironments('firefox'); // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
});
