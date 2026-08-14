//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';

import { type Message, type PeerInfo } from '../signal-methods';
import { TestEdgeMesh } from '../testing';
import { EdgeSignalManager } from './edge-signal-manager';

// DX-1125: exercise the broadcast pub/sub paths of EdgeSignalManager against an in-memory edge.

const TRACE_TAG = 'type:status.update';

const payload = (value: number[]) => ({ type_url: 'dxos.compute.TraceMessage', value: new Uint8Array(value) });

/**
 * A capture sink for a single subscription. Delivered messages are classified by shape: a broadcast
 * carries `tags` and no `recipient`; a point-to-point message carries a `recipient` (DX-1125).
 */
const capture = () => {
  const messages: Message[] = [];
  const broadcasts: Message[] = [];
  const onMessage = (message: Message) => {
    if (message.recipient != null) {
      messages.push(message);
    } else {
      broadcasts.push(message);
    }
  };
  return { messages, broadcasts, onMessage };
};

/**
 * Wire an EdgeSignalManager to a mesh connection and join `topic`. Returns the manager and its peer
 * info; subscriptions (with their capture sinks) are created per-test.
 */
const setupPeer = async (mesh: TestEdgeMesh, topic: PublicKey, name: string) => {
  const peer: PeerInfo = { peerKey: PublicKey.random().toHex(), identityDid: `did:test:${name}` };
  const connection = mesh.createConnection({ peerKey: peer.peerKey!, identityDid: peer.identityDid! });
  const manager = new EdgeSignalManager({ edgeConnection: connection as any });
  await manager.open();
  await manager.join(Context.default(), { topic, peer });
  return { manager, peer };
};

// A broadcast addresses its target swarm via `author.swarmKey` (DX-1125).
const broadcast = (peer: PeerInfo, topic: PublicKey, tags: string[], value: number[]) => ({
  author: { ...peer, swarmKey: topic.toHex() },
  tags,
  payload: payload(value),
});

describe('EdgeSignalManager broadcast (DX-1125)', () => {
  test('delivers a tag broadcast to a subscriber whose tags intersect', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    const sink = capture();
    await subscriber.manager.subscribeMessages({ peer: subscriber.peer, tags: [TRACE_TAG], onMessage: sink.onMessage });
    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, [TRACE_TAG], [1, 2, 3]));

    expect(sink.broadcasts).toHaveLength(1);
    expect(sink.broadcasts[0].tags).toContain(TRACE_TAG);
    expect(sink.broadcasts[0].author.peerKey).toBe(publisher.peer.peerKey);
    expect([...sink.broadcasts[0].payload.value]).toEqual([1, 2, 3]);
    // Broadcasts are not point-to-point messages.
    expect(sink.messages).toHaveLength(0);
  });

  test('does not deliver broadcasts whose tags do not intersect the subscription', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    const sink = capture();
    await subscriber.manager.subscribeMessages({
      peer: subscriber.peer,
      tags: ['type:operation.input'],
      onMessage: sink.onMessage,
    });
    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, [TRACE_TAG], [9]));

    expect(sink.broadcasts).toHaveLength(0);
  });

  test('excludes the author from its own broadcast', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');

    // The publisher is also a subscriber for the same tag.
    const sink = capture();
    await publisher.manager.subscribeMessages({ peer: publisher.peer, tags: [TRACE_TAG], onMessage: sink.onMessage });
    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, [TRACE_TAG], [1]));

    expect(sink.broadcasts).toHaveLength(0);
  });

  test('re-establishes the subscription across reconnect', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    const sink = capture();
    await subscriber.manager.subscribeMessages({ peer: subscriber.peer, tags: [TRACE_TAG], onMessage: sink.onMessage });
    // Simulate a reconnect: the manager re-joins swarms and re-sends its subscription.
    await (subscriber.manager as any)._rejoinAllSwarms();

    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, [TRACE_TAG], [7]));

    expect(sink.broadcasts).toHaveLength(1);
  });

  test('one consumer unsubscribing does not clobber another consumer of the same tag', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    // Two consumers on the same client share the manager's tag subscription (e.g. trace-progress and
    // a story module both watching status updates). The bug (DX-1125): one consumer's teardown
    // wholesale-cleared the shared tag set, so the other went silent. The refcounted per-subscription
    // teardown releases only the tags that subscription added.
    const first = capture();
    const second = capture();
    await subscriber.manager.subscribeMessages({
      peer: subscriber.peer,
      tags: [TRACE_TAG],
      onMessage: first.onMessage,
    });
    const unsubscribeSecond = await subscriber.manager.subscribeMessages({
      peer: subscriber.peer,
      tags: [TRACE_TAG, 'space:test-space'],
      onMessage: second.onMessage,
    });
    await unsubscribeSecond();

    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, [TRACE_TAG], [5]));

    // The first consumer's registration of TRACE_TAG survives; the released space tag does not.
    expect(first.broadcasts).toHaveLength(1);
    expect([...first.broadcasts[0].payload.value]).toEqual([5]);

    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, ['space:test-space'], [6]));
    expect(first.broadcasts).toHaveLength(1);
  });

  test('releasing the last registration of a tag stops delivery', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const publisher = await setupPeer(mesh, topic, 'publisher');
    const subscriber = await setupPeer(mesh, topic, 'subscriber');

    const sink = capture();
    const unsubscribe = await subscriber.manager.subscribeMessages({
      peer: subscriber.peer,
      tags: [TRACE_TAG],
      onMessage: sink.onMessage,
    });
    await unsubscribe();

    await publisher.manager.sendMessage(Context.default(), broadcast(publisher.peer, topic, [TRACE_TAG], [8]));

    expect(sink.broadcasts).toHaveLength(0);
  });

  test('still delivers point-to-point messages', async ({ expect }) => {
    const mesh = new TestEdgeMesh();
    const topic = PublicKey.random();
    const sender = await setupPeer(mesh, topic, 'sender');
    const recipient = await setupPeer(mesh, topic, 'recipient');

    const sink = capture();
    await recipient.manager.subscribeMessages({ peer: recipient.peer, onMessage: sink.onMessage });
    await sender.manager.sendMessage(Context.default(), {
      author: sender.peer,
      recipient: recipient.peer,
      payload: payload([4, 2]),
    });

    expect(sink.messages).toHaveLength(1);
    expect(sink.messages[0].author.peerKey).toBe(sender.peer.peerKey);
    expect(sink.broadcasts).toHaveLength(0);
  });
});
