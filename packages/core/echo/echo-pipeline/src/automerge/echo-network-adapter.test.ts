//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { sleep, Trigger, waitForCondition } from '@dxos/async';
import { cbor, type PeerId } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type SyncMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/automerge';
import {
  type AutomergeReplicator,
  type AutomergeReplicatorCallbacks,
  type AutomergeReplicatorFactory,
} from '@dxos/teleport-extension-automerge-replicator';
import { afterTest, describe, test } from '@dxos/test';

import { EchoNetworkAdapter } from './echo-network-adapter';
import { MeshEchoReplicator } from './mesh-echo-replicator';

const PEER_ID = 'peerA' as PeerId;
const ANOTHER_PEER_ID = 'peerB' as PeerId;
const PAYLOAD = new Uint8Array([42]);

describe('EchoNetworkAdapter', () => {
  test('peer-candidate emitted when replication starts', async () => {
    const controller = createReplicatorController();
    const adapter = await createConnectedAdapter(controller.replicator);
    const peerInfo = new Trigger<any>();
    adapter.on('peer-candidate', (payload) => peerInfo.wake(payload));
    await controller.connectPeer(ANOTHER_PEER_ID);
    const emittedInfo = await peerInfo.wait();
    expect(emittedInfo.peerId).to.eq(ANOTHER_PEER_ID);
  });

  test('message emitted when sync message is received', async () => {
    const controller = createReplicatorController();
    const adapter = await createConnectedAdapter(controller.replicator);
    const messageReceived = new Trigger<any>();
    adapter.on('message', (message) => messageReceived.wake(message));
    const callbacks = await controller.connectPeer(ANOTHER_PEER_ID);
    await callbacks.onSyncMessage!(encodeSyncPayload(PAYLOAD));
    const receivedMessage = await messageReceived.wait();
    expect(receivedMessage).to.deep.eq(PAYLOAD);
  });

  test('peer disconnects when onClose callback is invoked', async () => {
    const controller = createReplicatorController();
    const adapter = await createConnectedAdapter(controller.replicator);
    const callbacks = await controller.connectPeer(ANOTHER_PEER_ID);
    const onDisconnected = new Trigger<any>();
    adapter.on('peer-disconnected', (payload) => onDisconnected.wake(payload));
    await callbacks.onClose!();
    const disconnectedPeer = await onDisconnected.wait();
    expect(disconnectedPeer.peerId).to.eq(ANOTHER_PEER_ID);
  });

  test('peer disconnects when message sending fails', async () => {
    let errored = false;
    const controller = createReplicatorController(async () => {
      errored = true;
      throw new Error();
    });
    const adapter = await createConnectedAdapter(controller.replicator);
    await controller.connectPeer(ANOTHER_PEER_ID);
    const onDisconnected = new Trigger<any>();
    adapter.on('peer-disconnected', (payload) => onDisconnected.wake(payload));
    adapter.send(newSyncMessage(PEER_ID, ANOTHER_PEER_ID, PAYLOAD));
    const disconnectedPeer = await onDisconnected.wait();
    expect(disconnectedPeer.peerId).to.eq(ANOTHER_PEER_ID);
    expect(errored).to.be.true;
  });

  test('peer disconnected when replicator is removed', async () => {
    const controller = createReplicatorController();
    const adapter = await createConnectedAdapter(controller.replicator);
    await controller.connectPeer(ANOTHER_PEER_ID);
    const onDisconnected = new Trigger<any>();
    adapter.on('peer-disconnected', (payload) => onDisconnected.wake(payload));
    await adapter.removeReplicator(controller.replicator);
    const disconnectedPeer = await onDisconnected.wait();
    expect(disconnectedPeer.peerId).to.eq(ANOTHER_PEER_ID);
  });

  test('message sending is queued', async () => {
    let sentTotal = 0;
    let sendInProgress = false;
    const controller = createReplicatorController(async () => {
      invariant(!sendInProgress);
      sendInProgress = true;
      await sleep(5);
      sendInProgress = false;
      sentTotal++;
    });
    const adapter = await createConnectedAdapter(controller.replicator);
    await controller.connectPeer(ANOTHER_PEER_ID);
    const totalMessages = 5;
    for (let i = 0; i < totalMessages; i++) {
      adapter.send(newSyncMessage(PEER_ID, ANOTHER_PEER_ID, PAYLOAD));
    }
    await waitForCondition({ condition: () => sentTotal === totalMessages });
  });

  const createConnectedAdapter = async (replicator: MeshEchoReplicator) => {
    const adapter = new EchoNetworkAdapter({
      getContainingSpaceForDocument: async () => null,
      onCollectionStateQueried: () => {},
      onCollectionStateReceived: () => {},
    });
    adapter.connect(PEER_ID);
    await adapter.open();
    afterTest(() => adapter.close());
    await adapter.addReplicator(replicator);
    return adapter;
  };

  const createReplicatorController = (sendSyncMessage?: (message: SyncMessage) => Promise<void>) => {
    const replicator = new MeshEchoReplicator();
    return {
      replicator,
      connectPeer: async (peerId: string) => {
        let callbacks: AutomergeReplicatorCallbacks | undefined;
        const extensionFactory: AutomergeReplicatorFactory = (params) => {
          callbacks = params[1];
          return { sendSyncMessage } as AutomergeReplicator;
        };
        replicator.createExtension(extensionFactory);
        invariant(callbacks);
        await callbacks.onStartReplication!({ id: peerId }, PublicKey.random());
        return callbacks;
      },
    };
  };

  const newSyncMessage = (from: PeerId, to: PeerId, payload: Uint8Array) => ({
    type: 'sync',
    senderId: from,
    targetId: to,
    data: payload,
  });

  const encodeSyncPayload = (payload: Uint8Array): SyncMessage => ({
    payload: cbor.encode(payload),
  });
});
