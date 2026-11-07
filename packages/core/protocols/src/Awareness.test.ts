//
// Copyright 2026 DXOS.org
//

import { type JsonObject, type JsonValue, create } from '@bufbuild/protobuf';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, onTestFinished, test, vi } from 'vitest';

import * as Awareness from './Awareness.ts';
import { packJson } from './buf/index.ts';
import { type GossipMessage, GossipMessageSchema } from './buf/proto/gen/dxos/mesh/teleport/gossip_pb.ts';
import { type ListenHandle, type Messenger } from './messenger.ts';

const LISTEN_DELAY = 10;
const CHANNEL = Awareness.channelId('pointer', 'dxn:test');

/** A drawing's pointer, in the drawing's own coordinates. */
const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
type Point = typeof Point.Type;

/** A grid's selection, named by row and column ids rather than positions. */
const CellRange = Schema.Struct({
  anchor: Schema.Struct({ col: Schema.String, row: Schema.String }),
  head: Schema.Struct({ col: Schema.String, row: Schema.String }),
});

/** Pointer-like timing: a short heartbeat and an idle withdraw. */
const TIMING: Awareness.Timing = { throttle: 50, heartbeat: 5_000, idle: 60_000 };
const NETWORK_DELAY = 1;

/**
 * Gossip as a space delivers it: only to peers connected when a message is sent, never replayed, and
 * dropped by a listener that is not yet registered.
 */
class TestNetwork {
  connected = true;
  readonly posts: JsonObject[] = [];

  readonly #listeners = new Set<{ peer: string; ready: boolean; callback: (message: GossipMessage) => void }>();

  createMessenger(peer: string): Messenger {
    return {
      listen: (_channel, callback) => {
        const listener = { peer, ready: false, callback };
        this.#listeners.add(listener);
        const ready = new Promise<void>((resolve) =>
          setTimeout(() => {
            listener.ready = true;
            resolve();
          }, LISTEN_DELAY),
        );
        const handle: ListenHandle = Object.assign(() => void this.#listeners.delete(listener), { ready });
        return handle;
      },
      postMessage: async (channelId: string, json: JsonObject) => {
        this.posts.push(json);
        if (!this.connected) {
          return;
        }
        const message = create(GossipMessageSchema, { channelId, payload: packJson(json) });
        const recipients = [...this.#listeners].filter((listener) => listener.peer !== peer);
        setTimeout(() => {
          for (const listener of recipients) {
            if (listener.ready && this.#listeners.has(listener)) {
              listener.callback(message);
            }
          }
        }, NETWORK_DELAY);
      },
    };
  }

  createChannel(peer: string): Awareness.Channel<Point> {
    return this.createChannelOf(peer, Point);
  }

  createChannelOf<T, I extends JsonValue>(
    peer: string,
    schema: Schema.Codec<T, I>,
    { channel: channelId = CHANNEL, peerId = peer }: { channel?: string; peerId?: string } = {},
  ): Awareness.Channel<T, I> {
    const channel = new Awareness.Channel({
      messenger: this.createMessenger(peer),
      channel: channelId,
      peer: { peerId, info: { displayName: peerId, darkColor: 'red', lightColor: 'red', hue: 'red' } },
      schema,
      timing: TIMING,
    });
    channel.open();
    onTestFinished(() => channel.close());
    return channel;
  }
}

const { throttle, heartbeat, idle = 0 } = TIMING;
const EXPIRY = Awareness.expiry(TIMING);

/** Sessions that share a value; a withdrawn one stays open but draws nothing. */
const values = (channel: Awareness.Channel<Point>) =>
  channel.getSessions().flatMap(({ info, value }) => (value ? [{ name: info.displayName, ...value }] : []));

describe('Awareness.Channel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a peer sees another peer with its name, hue and point', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    host.update({ x: 10, y: 20 });
    await vi.advanceTimersByTimeAsync(NETWORK_DELAY * 2);
    expect(guest.getSessions()).toEqual([
      expect.objectContaining({
        peerId: 'host',
        info: expect.objectContaining({ displayName: 'host', hue: 'red' }),
        value: { x: 10, y: 20 },
      }),
    ]);
  });

  test('a peer that opens later receives existing state', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    host.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2 + throttle);
    expect(values(guest)).toEqual([{ name: 'host', x: 1, y: 1 }]);
  });

  test('a burst of moves is throttled and ends on the last point', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);
    network.posts.length = 0;

    for (let x = 0; x < 20; x++) {
      host.update({ x, y: 0 });
      await vi.advanceTimersByTimeAsync(5);
    }
    await vi.advanceTimersByTimeAsync(throttle);

    const posts = network.posts.filter((post) => post.kind === 'post');
    expect(posts.length).toBeLessThanOrEqual(3);
    expect(values(guest)).toEqual([{ name: 'host', x: 19, y: 0 }]);
  });

  test('withdrawing the value removes it from peers', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    host.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(throttle);
    expect(values(guest)).toHaveLength(1);

    host.update(undefined);
    await vi.advanceTimersByTimeAsync(throttle);
    expect(values(guest)).toEqual([]);
  });

  test('closing a channel removes it from peers', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    host.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(throttle);
    host.close();
    await vi.advanceTimersByTimeAsync(NETWORK_DELAY * 2);
    expect(values(guest)).toEqual([]);
  });

  test('a peer that stops answering expires', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    host.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(throttle);
    expect(values(guest)).toHaveLength(1);

    network.connected = false;
    await vi.advanceTimersByTimeAsync(EXPIRY + heartbeat);
    expect(values(guest)).toEqual([]);
  });

  test('heartbeats keep a still pointer until it goes idle', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    host.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(EXPIRY * 2);
    expect(values(guest)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(idle);
    expect(values(guest)).toEqual([]);

    host.update({ x: 2, y: 2 });
    await vi.advanceTimersByTimeAsync(throttle);
    expect(values(guest)).toEqual([{ name: 'host', x: 2, y: 2 }]);
  });

  test('a malformed message is ignored', async ({ expect }) => {
    const network = new TestNetwork();
    const guest = network.createChannel('guest');
    const rogue = network.createMessenger('rogue');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    await rogue.postMessage(CHANNEL, {
      kind: 'post',
      state: { peerId: 'rogue', info: { displayName: 'rogue' }, position: { x: 'left' } },
      sessionId: 'rogue',
      age: 0,
    });
    await vi.advanceTimersByTimeAsync(NETWORK_DELAY * 2);
    expect(values(guest)).toEqual([]);
  });

  test('a withdrawn value is re-announced, so a lost withdraw heals', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createChannel('host');
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    host.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(throttle);
    network.connected = false;
    host.update(undefined);
    await vi.advanceTimersByTimeAsync(throttle);
    network.connected = true;
    expect(values(guest)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(heartbeat);
    expect(values(guest)).toEqual([]);
  });

  test('speaks the wire format of clients that predate sessions', async ({ expect }) => {
    const network = new TestNetwork();
    const guest = network.createChannel('guest');
    const legacy = network.createMessenger('legacy');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    await legacy.postMessage(CHANNEL, {
      kind: 'post',
      state: { peerId: 'legacy', info: { displayName: 'legacy' }, position: { x: 3, y: 4 } },
    });
    await vi.advanceTimersByTimeAsync(EXPIRY * 2);
    expect(values(guest)).toEqual([{ name: 'legacy', x: 3, y: 4 }]);
  });

  test('carries a value in any coordinates the surface defines', async ({ expect }) => {
    const network = new TestNetwork();
    const gridChannel = Awareness.channelId('selection', 'dxn:test');
    const host = network.createChannelOf('host', CellRange, { channel: gridChannel });
    const guest = network.createChannelOf('guest', CellRange, { channel: gridChannel });
    const pointer = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    const range = { anchor: { col: 'name', row: 'alice' }, head: { col: 'email', row: 'bob' } };
    host.update(range);
    await vi.advanceTimersByTimeAsync(throttle);
    expect(guest.getSessions().map(({ value }) => value)).toEqual([range]);
    expect(pointer.getSessions()).toEqual([]);
  });
});

describe('Awareness.latestPerPeer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows one session per identity: the most recent, preferring those with a value', async ({ expect }) => {
    const network = new TestNetwork();
    const laptop = network.createChannelOf('laptop', Point, { peerId: 'alice' });
    const phone = network.createChannelOf('phone', Point, { peerId: 'alice' });
    const guest = network.createChannel('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);

    laptop.update({ x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(throttle);
    phone.update({ x: 2, y: 2 });
    await vi.advanceTimersByTimeAsync(throttle);
    expect(guest.getSessions()).toHaveLength(2);
    expect(Awareness.latestPerPeer(guest.getSessions()).map(({ value }) => value)).toEqual([{ x: 2, y: 2 }]);

    phone.update(undefined);
    await vi.advanceTimersByTimeAsync(throttle);
    expect(Awareness.latestPerPeer(guest.getSessions()).map(({ value }) => value)).toEqual([undefined]);
    expect(
      Awareness.latestPerPeer(guest.getSessions(), { prefer: ({ value }) => value !== undefined }).map(
        ({ value }) => value,
      ),
    ).toEqual([{ x: 1, y: 1 }]);
  });
});
