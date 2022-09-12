//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Space } from './space';

describe('space/space', () => {
  test.only('Genesis', async () => {
    const space = new Space({
      spaceKey: undefined,
      initialTimeframe: undefined,
      genesisFeed: undefined,
      controlWriteFeed: undefined,
      dataWriteFeed: undefined,
      feedProvider: undefined
    });

    // TODO(burdon): Standardize getters.
    expect(space.isOpen).toBeFalsy();
  });
});
