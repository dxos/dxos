//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';

import { type Message, type PeerInfo } from '../signal-methods';
import { MemorySignalManager, MemorySignalManagerContext } from './memory-signal-manager';

// Exercises the subscription/routing behavior of the in-memory signal manager: point-to-point routing
// by recipient, broadcast routing by tag intersection (DX-1125), fan-out, and unsubscribe lifecycle.

const payload = (value: number[]) => ({ type_url: 'dxos.test.Message', value: new Uint8Array(value) });

const randomPeer = (name: string): PeerInfo => ({
  peerKey: PublicKey.random().toHex(),
  identityDid: `did:test:${name}`,
});

/**
 * A capture sink for a single subscription. Delivered messages are classified by shape: a
 * point-to-point message carries a `recipient`; a broadcast carries `tags` and no `recipient`.
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

const openManager = async (context: MemorySignalManagerContext): Promise<MemorySignalManager> => {
  const manager = new MemorySignalManager(context);
  await manager.open();
  onTestFinished(() => manager.close());
  return manager;
};

describe('MemorySignalManager', () => {
  test('delivers a point-to-point message to the recipient subscription', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const receiver = await openManager(context);
    const senderPeer = randomPeer('sender');
    const receiverPeer = randomPeer('receiver');

    const sink = capture();
    await receiver.subscribeMessages({ peer: receiverPeer, onMessage: sink.onMessage });
    await sender.sendMessage(Context.default(), {
      author: senderPeer,
      recipient: receiverPeer,
      payload: payload([1, 2, 3]),
    });

    await expect.poll(() => sink.messages.length).toBe(1);
    expect(sink.messages[0].author.peerKey).toBe(senderPeer.peerKey);
    expect([...sink.messages[0].payload.value]).toEqual([1, 2, 3]);
    expect(sink.broadcasts).toHaveLength(0);
  });

  test('routes point-to-point messages by recipient', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const receiverA = await openManager(context);
    const receiverB = await openManager(context);
    const peerA = randomPeer('a');
    const peerB = randomPeer('b');

    const sinkA = capture();
    const sinkB = capture();
    await receiverA.subscribeMessages({ peer: peerA, onMessage: sinkA.onMessage });
    await receiverB.subscribeMessages({ peer: peerB, onMessage: sinkB.onMessage });

    await sender.sendMessage(Context.default(), {
      author: randomPeer('sender'),
      recipient: peerB,
      payload: payload([2]),
    });

    await expect.poll(() => sinkB.messages.length).toBe(1);
    expect([...sinkB.messages[0].payload.value]).toEqual([2]);
    // The message addressed to peerB is not delivered to peerA's subscription.
    await sleep(20);
    expect(sinkA.messages).toHaveLength(0);
  });

  test('fans a point-to-point message out to every subscription for the peer', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const receiver = await openManager(context);
    const receiverPeer = randomPeer('receiver');

    const first = capture();
    const second = capture();
    await receiver.subscribeMessages({ peer: receiverPeer, onMessage: first.onMessage });
    await receiver.subscribeMessages({ peer: receiverPeer, onMessage: second.onMessage });
    await sender.sendMessage(Context.default(), {
      author: randomPeer('sender'),
      recipient: receiverPeer,
      payload: payload([7]),
    });

    await expect.poll(() => first.messages.length).toBe(1);
    await expect.poll(() => second.messages.length).toBe(1);
  });

  test('stops delivery after unsubscribe', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const receiver = await openManager(context);
    const senderPeer = randomPeer('sender');
    const receiverPeer = randomPeer('receiver');

    const sink = capture();
    const unsubscribe = await receiver.subscribeMessages({ peer: receiverPeer, onMessage: sink.onMessage });
    await sender.sendMessage(Context.default(), { author: senderPeer, recipient: receiverPeer, payload: payload([1]) });
    await expect.poll(() => sink.messages.length).toBe(1);

    await unsubscribe();
    await sender.sendMessage(Context.default(), { author: senderPeer, recipient: receiverPeer, payload: payload([2]) });
    await sleep(20);
    expect(sink.messages).toHaveLength(1);
  });

  test('keeps delivering to remaining subscriptions after one unsubscribes', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const receiver = await openManager(context);
    const receiverPeer = randomPeer('receiver');

    const first = capture();
    const second = capture();
    const unsubscribeFirst = await receiver.subscribeMessages({ peer: receiverPeer, onMessage: first.onMessage });
    await receiver.subscribeMessages({ peer: receiverPeer, onMessage: second.onMessage });

    // Releasing one subscription keeps the shared-context connection alive for the other.
    await unsubscribeFirst();
    await sender.sendMessage(Context.default(), {
      author: randomPeer('sender'),
      recipient: receiverPeer,
      payload: payload([5]),
    });

    await expect.poll(() => second.messages.length).toBe(1);
    expect(first.messages).toHaveLength(0);
  });

  test('delivers a broadcast only to subscriptions whose tags intersect', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const receiver = await openManager(context);

    const matching = capture();
    const nonMatching = capture();
    await receiver.subscribeMessages({ peer: randomPeer('a'), tags: ['type:a'], onMessage: matching.onMessage });
    await receiver.subscribeMessages({ peer: randomPeer('b'), tags: ['type:b'], onMessage: nonMatching.onMessage });

    await sender.sendMessage(Context.default(), {
      author: randomPeer('sender'),
      tags: ['type:a'],
      payload: payload([4, 2]),
    });

    await expect.poll(() => matching.broadcasts.length).toBe(1);
    expect(matching.broadcasts[0].tags).toContain('type:a');
    expect([...matching.broadcasts[0].payload.value]).toEqual([4, 2]);
    // Broadcasts are not point-to-point, and the non-intersecting subscription gets nothing.
    expect(matching.messages).toHaveLength(0);
    await sleep(20);
    expect(nonMatching.broadcasts).toHaveLength(0);
  });

  test('rejects a message that sets neither or both of recipient and tags', async () => {
    const context = new MemorySignalManagerContext();
    const sender = await openManager(context);
    const author = randomPeer('sender');

    // Neither recipient nor tags.
    await expect(sender.sendMessage(Context.default(), { author, payload: payload([1]) })).rejects.toThrow();
    // Both recipient and tags.
    await expect(
      sender.sendMessage(Context.default(), {
        author,
        recipient: randomPeer('receiver'),
        tags: ['type:a'],
        payload: payload([1]),
      }),
    ).rejects.toThrow();
  });
});
