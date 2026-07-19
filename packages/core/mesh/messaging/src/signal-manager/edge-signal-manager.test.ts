//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';

import { type BroadcastMessage, type Message, type PeerInfo } from '../signal-methods';
import { TestEdgeMesh } from '../testing';
import { EdgeSignalManager } from './edge-signal-manager';

// DX-1125: exercise the broadcast pub/sub paths of EdgeSignalManager against an in-memory edge.

const TRACE_TAG = 'type:status.update';

const payload = (value: number[]) => ({ type_url: 'dxos.compute.TraceMessage', value: new Uint8Array(value) });

/**
 * Wire an EdgeSignalManager to a mesh connection and join `topic`. Returns the manager, its peer
 * info, and captured `onMessage` / `onBroadcast` events.
 */
const setupPeer = async (mesh: TestEdgeMesh, topic: PublicKey, name: string) => {
  const peer: PeerInfo = { peerKey: PublicKey.random().toHex(), identityDid: `did:test:${name}` };
  const connection = mesh.createConnection({ peerKey: peer.peerKey!, identityDid: peer.identityDid! });
  const manager = new EdgeSignalManager({ edgeConnection: connection as any });
  await manager.open();

  const broadcasts: BroadcastMessage[] = [];
  const messages: Message[] = [];
  manager.onBroadcast.on((broadcast) => {
    broadcasts.push(broadcast);
  });
  manager.onMessage.on((message) => {
    messages.push(message);
  });

  await manager.join(Context.default(), { topic, peer });
  return { manager, peer, broadcasts, messages };
};

describe('EdgeSignalManager broadcast (DX-1125)', () => {
  test('delivers a tag broadcast to a subscriber whose tags intersect', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    await subscriber.manager.subscribeMessages(subscriber.peer, [TRACE_TAG]);
    await publisher.manager.sendBroadcast(Context.default(), {
      author: publisher.peer,
      swarmKey: topic.toHex(),
      tags: [TRACE_TAG],
      payload: payload([1, 2, 3]),
    });

    expect(subscriber.broadcasts).toHaveLength(1);
    expect(subscriber.broadcasts[0].tags).toContain(TRACE_TAG);
    expect(subscriber.broadcasts[0].author.peerKey).toBe(publisher.peer.peerKey);
    expect([...subscriber.broadcasts[0].payload.value]).toEqual([1, 2, 3]);
    // Broadcasts are not point-to-point messages.
    expect(subscriber.messages).toHaveLength(0);
  });

  test('does not deliver broadcasts whose tags do not intersect the subscription', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    await subscriber.manager.subscribeMessages(subscriber.peer, ['type:operation.input']);
    await publisher.manager.sendBroadcast(Context.default(), {
      author: publisher.peer,
      swarmKey: topic.toHex(),
      tags: [TRACE_TAG],
      payload: payload([9]),
    });

    expect(subscriber.broadcasts).toHaveLength(0);
  });

  test('excludes the author from its own broadcast', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');

    // The publisher is also a subscriber for the same tag.
    await publisher.manager.subscribeMessages(publisher.peer, [TRACE_TAG]);
    await publisher.manager.sendBroadcast(Context.default(), {
      author: publisher.peer,
      swarmKey: topic.toHex(),
      tags: [TRACE_TAG],
      payload: payload([1]),
    });

    expect(publisher.broadcasts).toHaveLength(0);
  });

  test('re-establishes the subscription across reconnect', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    await subscriber.manager.subscribeMessages(subscriber.peer, [TRACE_TAG]);
    // Simulate a reconnect: the manager re-joins swarms and re-sends its subscription.
    await (subscriber.manager as any)._rejoinAllSwarms();

    await publisher.manager.sendBroadcast(Context.default(), {
      author: publisher.peer,
      swarmKey: topic.toHex(),
      tags: [TRACE_TAG],
      payload: payload([7]),
    });

    expect(subscriber.broadcasts).toHaveLength(1);
  });

  test('still delivers point-to-point messages', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const sender = await setupPeer(mesh, topic, 'sender');
    const recipient = await setupPeer(mesh, topic, 'recipient');

    await sender.manager.sendMessage(Context.default(), {
      author: sender.peer,
      recipient: recipient.peer,
      payload: payload([4, 2]),
    });

    expect(recipient.messages).toHaveLength(1);
    expect(recipient.messages[0].author.peerKey).toBe(sender.peer.peerKey);
    expect(recipient.broadcasts).toHaveLength(0);
  });
});
