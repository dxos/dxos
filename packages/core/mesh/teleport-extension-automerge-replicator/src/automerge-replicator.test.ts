//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Trigger } from '@dxos/async';
import { type PeerInfo, type SyncMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/automerge';
import { TestBuilder, type TestConnection, TestPeer } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { AutomergeReplicator, type AutomergeReplicatorCallbacks } from './automerge-replicator';

chai.use(chaiAsPromised);

describe('AutomergeReplicator', () => {
  test('Two peers discover each other', async () => {
    const [peer1, peer2] = await setupConnectedPeers();
    const onPeer2ConnectedTo1 = registerReplicator(peer1).onReplicationStarted;
    const onPeer1ConnectedTo2 = registerReplicator(peer2).onReplicationStarted;
    expect((await onPeer2ConnectedTo1.wait({ timeout: 50 })).id).to.eq(peer2.info.peerId.toHex());
    expect((await onPeer1ConnectedTo2.wait({ timeout: 50 })).id).to.eq(peer1.info.peerId.toHex());
  });

  describe('sendSyncMessage', () => {
    test('retries', async () => {
      const [peer1, peer2] = await setupConnectedPeers();
      let failedOnce = false;
      let deliveredMessage: SyncMessage | undefined;
      registerReplicator(peer1, {
        onSyncMessage: async (message: SyncMessage) => {
          if (failedOnce) {
            deliveredMessage = message;
          } else {
            failedOnce = true;
            throw new Error();
          }
        },
      });
      const replicator2 = registerReplicator(peer2);
      await replicator2.extension.sendSyncMessage({ payload: new Uint8Array([42]) });
      expect(failedOnce).to.be.true;
      expect(deliveredMessage!.payload[0]).to.eq(42);
    });

    test('throws after close', async () => {
      const [peer1] = await setupConnectedPeers();
      const replicator = registerReplicator(peer1);
      await replicator.extension.onClose();
      await expect(replicator.extension.sendSyncMessage({ payload: new Uint8Array([]) })).to.be.rejected;
    });

    test('waits for replication to get started', async () => {
      const [peer1, peer2] = await setupConnectedPeers();
      const replicator = registerReplicator(peer1);
      void replicator.extension.sendSyncMessage({ payload: new Uint8Array([42]) });

      const onMessage = new Trigger<SyncMessage>();
      registerReplicator(peer2, {
        onSyncMessage: async (message: SyncMessage) => {
          onMessage.wake(message);
        },
      });
      const deliveredMessage = await onMessage.wait();
      expect(deliveredMessage.payload[0]).to.eq(42);
    });

    test('closes connection if retries exceeded', async () => {
      const [peer1, peer2] = await setupConnectedPeers();
      registerReplicator(peer1, {
        onSyncMessage: async () => {
          throw new Error();
        },
      });
      const onConnectionClosed = new Trigger<Error | undefined>();
      const replicator2 = registerReplicator(peer2, {
        onClose: async (err) => {
          onConnectionClosed.wake(err);
        },
      });
      await expect(replicator2.extension.sendSyncMessage({ payload: new Uint8Array([42]) })).to.be.rejected;
      const sendError = await onConnectionClosed.wait();
      expect(sendError).not.to.be.undefined;
    });
  });

  const registerReplicator = (peer: TestConnectedTestPeer, callbacks?: AutomergeReplicatorCallbacks) => {
    const onReplicationStarted = new Trigger<PeerInfo>();
    const extension = new AutomergeReplicator(
      {
        peerId: peer.info.peerId.toHex(),
        sendSyncRetryPolicy: {
          maxRetries: 3,
          retriesBeforeBackoff: 3,
          retryBackoff: 10,
        },
      },
      {
        onStartReplication: async (info) => {
          onReplicationStarted.wake(info);
        },
        onSyncMessage: callbacks?.onSyncMessage,
        onClose: callbacks?.onClose,
      },
    );
    peer.connection.teleport.addExtension('dxos.mesh.teleport.automerge', extension);
    return { extension, onReplicationStarted };
  };

  const setupConnectedPeers = async (): Promise<[TestConnectedTestPeer, TestConnectedTestPeer]> => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);
    return [
      { info: peer1, connection: connection1 },
      { info: peer2, connection: connection2 },
    ];
  };
});

type TestConnectedTestPeer = { info: TestPeer; connection: TestConnection };
