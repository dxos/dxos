//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { describe, test } from '@dxos/test';

// TODO(wittjosiah): Factor out.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

describe('Smoke test', function () {
  // NOTE: This test depends on connecting to the default production deployed HALO vault.
  test('Renders remote client info', async function (this, _) {
    await this.page.goto(storybookUrl('react-client-clientcontext--primary'));

    await waitForExpect(async () => {
      const isVisible = await this.page.isVisible(':has-text("initialized")');
      expect(isVisible).to.be.true;
    });
  });
});
