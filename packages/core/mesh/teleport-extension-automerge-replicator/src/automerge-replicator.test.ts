//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Trigger } from '@dxos/async';
import { type PeerInfo } from '@dxos/protocols/proto//dxos/mesh/teleport/automerge';
import { TestBuilder, TestPeer } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { AutomergeReplicator } from './automerge-replicator';

describe('AutomergeReplicator', () => {
  test('Two peers discover each other', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);

    const trigger1 = new Trigger<PeerInfo>();
    const extension1 = new AutomergeReplicator(
      { peerId: peer1.peerId.toHex() },
      {
        onStartReplication: async (info) => {
          trigger1.wake(info);
        },
      },
    );
    connection1.teleport.addExtension('dxos.mesh.teleport.automerge', extension1);

    const trigger2 = new Trigger<PeerInfo>();
    const extension2 = new AutomergeReplicator(
      { peerId: peer2.peerId.toHex() },
      {
        onStartReplication: async (info) => {
          trigger2.wake(info);
        },
      },
    );
    connection2.teleport.addExtension('dxos.mesh.teleport.automerge', extension2);

    expect((await trigger1.wait({ timeout: 50 })).id).toEqual(peer2.peerId.toHex());
    expect((await trigger2.wait({ timeout: 50 })).id).toEqual(peer1.peerId.toHex());
  });
});
