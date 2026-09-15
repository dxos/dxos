//
// Copyright 2024 DXOS.org
//

import { type PeerId, cbor } from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, sleep, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type SyncMessage } from '@dxos/protocols/buf/dxos/mesh/teleport/automerge_pb';
import { PeerInfoSchema, SyncMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/automerge_pb';
import {
  type AutomergeReplicator,
  type AutomergeReplicatorCallbacks,
} from '@dxos/teleport-extension-automerge-replicator';

import { EchoNetworkAdapter } from './echo-network-adapter.ts';
import { MeshEchoReplicator } from './mesh-echo-replicator.ts';

const PEER_ID = 'peerA' as PeerId;
const ANOTHER_PEER_ID = 'peerB' as PeerId;
const PAYLOAD = new Uint8Array([42]);

// TODO(burdon): Temp.
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
    let errors = 0;
    const controller = createReplicatorController(async () => {
      // NOTE: Error is caught in AM stack.
      throw new Error('Testing', { cause: { errors: ++errors } });
    });
    const adapter = await createConnectedAdapter(controller.replicator);
    await controller.connectPeer(ANOTHER_PEER_ID);
    const onDisconnected = new Trigger<any>();
    adapter.on('peer-disconnected', (payload) => onDisconnected.wake(payload));
    adapter.send(newSyncMessage(PEER_ID, ANOTHER_PEER_ID, PAYLOAD));
    const disconnectedPeer = await onDisconnected.wait();
    expect(disconnectedPeer.peerId).to.eq(ANOTHER_PEER_ID);
    expect(errors).to.eq(1);
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

  test('an auth scope change re-offers the peer by default', async () => {
    const controller = createReplicatorController();
    const adapter = await createConnectedAdapter(controller.replicator);
    await controller.connectPeer(ANOTHER_PEER_ID);
    const events: string[] = [];
    adapter.on('peer-disconnected', () => events.push('disconnected'));
    adapter.on('peer-candidate', () => events.push('candidate'));
    // A second session to the same peer widens the auth scope of the connection already enabled.
    await controller.connectPeer(ANOTHER_PEER_ID);
    expect(events).toEqual(['disconnected', 'candidate']);
  });

  test('an auth scope change goes to the handler instead of re-offering the peer', async () => {
    const controller = createReplicatorController();
    const changed: PeerId[] = [];
    const adapter = await createConnectedAdapter(controller.replicator, {
      onConnectionAuthScopeChanged: (peerId) => changed.push(peerId),
    });
    await controller.connectPeer(ANOTHER_PEER_ID);
    const events: string[] = [];
    adapter.on('peer-disconnected', () => events.push('disconnected'));
    adapter.on('peer-candidate', () => events.push('candidate'));
    await controller.connectPeer(ANOTHER_PEER_ID);
    expect(changed).toEqual([ANOTHER_PEER_ID]);
    expect(events).toEqual([]);
  });

  const createConnectedAdapter = async (
    replicator: MeshEchoReplicator,
    props: Partial<ConstructorParameters<typeof EchoNetworkAdapter>[0]> = {},
  ) => {
    const adapter = new EchoNetworkAdapter({
      getContainingSpaceForDocument: async () => null,
      getContainingSpaceIdForDocument: async () => null,
      isDocumentInRemoteCollection: async () => true,
      onCollectionStateQueried: () => {},
      onCollectionStateReceived: () => {},
      ...props,
    });
    adapter.connect(PEER_ID);
    await adapter.open();
    onTestFinished(async () => {
      await adapter.close();
    });
    await adapter.addReplicator(Context.default(), replicator);
    return adapter;
  };

  const createReplicatorController = (sendSyncMessage?: (message: SyncMessage) => Promise<void>) => {
    const replicator = new MeshEchoReplicator();
    return {
      replicator,
      connectPeer: async (peerId: string) => {
        let callbacks: AutomergeReplicatorCallbacks | undefined;
        replicator.createExtension((params) => {
          callbacks = params[1];
          return { sendSyncMessage } as AutomergeReplicator;
        });
        invariant(callbacks);
        await callbacks.onStartReplication!(create(PeerInfoSchema, { id: peerId }), PublicKey.random());
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

  const encodeSyncPayload = (payload: Uint8Array): SyncMessage =>
    create(SyncMessageSchema, { payload: cbor.encode(payload) });
});
