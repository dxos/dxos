//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { latch } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
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

  test('Peer reannounces itself by interval', async () => {
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const { presence1 } = await createPresencePair({
      peerId1,
      peerId2
    });
    let oldState: PeerState;
    const [announcedTwice, inc] = latch({ count: 2 });
    presence1.updatePeerStates.on((peerStates) => {
      expect(peerStates[0].peerId).toEqual(peerId2);
      if (!oldState) {
        oldState = peerStates[0];
      } else {
        expect(peerStates[0].timestamp.getTime()).toBeGreaterThan(oldState.timestamp.getTime());
      }
      inc();
    });
    await announcedTwice();
  });
});
