//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { createPresencePair } from './testing';

describe('PresenceExtension', () => {
  test('Two peers announce each other', async () => {
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const { presence1, presence2 } = await createPresencePair({
      peerId1,
      peerId2
    });
    await waitForExpect(() => expect(presence1.getPeerStates()[0].peerId).toEqual(peerId2));
    await waitForExpect(() => expect(presence2.getPeerStates()[0].peerId).toEqual(peerId1));
  });
});
