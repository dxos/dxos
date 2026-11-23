//
// Copyright 2026 DXOS.org
//

import { type JsonObject, create } from '@bufbuild/protobuf';
import { afterEach, beforeEach, describe, onTestFinished, test, vi } from 'vitest';

import { type ListenHandle, type Messenger } from '@dxos/protocols';
import { packJson } from '@dxos/protocols/buf';
import { type GossipMessage, GossipMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

import { SpaceAwarenessProvider } from './awareness-provider.ts';

const LISTEN_DELAY = 10;
const NETWORK_DELAY = 1;
const ANNOUNCE_INTERVAL = 15_000;
/** Longer than delivery plus the provider's 100 ms debounce between posts. */
const SETTLE = 500;

/**
 * Gossip as a space delivers it: to every other messenger (including other devices of the same identity)
 * connected when a message is sent, never replayed, and dropped by a listener that is not yet registered.
 */
class TestNetwork {
  connected = true;
  delay = NETWORK_DELAY;
  /** Rejects the next post with this error. */
  failNextPost?: Error;

  private readonly _listeners = new Set<{
    messenger: Messenger;
    ready: boolean;
    callback: (message: GossipMessage) => void;
  }>();

  createMessenger(): Messenger {
    const messenger: Messenger = {
      listen: (_channel, callback) => {
        const listener = { messenger, ready: false, callback };
        this._listeners.add(listener);
        const ready = new Promise<void>((resolve) =>
          setTimeout(() => {
            listener.ready = true;
            resolve();
          }, LISTEN_DELAY),
        );
        const handle: ListenHandle = Object.assign(() => void this._listeners.delete(listener), { ready });
        return handle;
      },
      postMessage: async (channelId: string, json: JsonObject) => {
        if (this.failNextPost) {
          const error = this.failNextPost;
          this.failNextPost = undefined;
          throw error;
        }
        if (!this.connected) {
          return;
        }
        const message = create(GossipMessageSchema, { channelId, payload: packJson(json) });
        const recipients = [...this._listeners].filter((listener) => listener.messenger !== messenger);
        setTimeout(() => {
          for (const listener of recipients) {
            if (listener.ready && this._listeners.has(listener)) {
              listener.callback(message);
            }
          }
        }, this.delay);
      },
    };
    return messenger;
  }

  createProvider(peer: string): SpaceAwarenessProvider {
    const provider = new SpaceAwarenessProvider({
      messenger: this.createMessenger(),
      channel: CHANNEL,
      peerId: peer,
      info: { displayName: peer, darkColor: 'red', lightColor: 'red' },
    });
    provider.open();
    onTestFinished(() => provider.close());
    return provider;
  }
}

const CHANNEL = 'awareness.test';

describe('SpaceAwarenessProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a peer that opens later receives existing state', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    const guest = network.createProvider('guest');
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(guest)).toEqual(['host']);
  });

  test('state reaches a peer whose connection forms after the last post', async ({ expect }) => {
    const network = new TestNetwork();
    network.connected = false;
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });
    const guest = network.createProvider('guest');
    await vi.advanceTimersByTimeAsync(SETTLE);

    network.connected = true;
    guest.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(host)).toEqual(['guest']);
    expect(peerIds(guest)).toEqual(['host']);
  });

  test('state is re-announced for a peer that never posts', async ({ expect }) => {
    const network = new TestNetwork();
    network.connected = false;
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });
    const guest = network.createProvider('guest');
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(guest)).toEqual([]);

    network.connected = true;
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);
    expect(peerIds(guest)).toEqual(['host']);
  });

  test('an unchanged re-announce does not notify', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });
    const guest = network.createProvider('guest');
    let changes = 0;
    guest.remoteStateChange.on(() => {
      changes++;
    });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(changes).toEqual(1);

    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL * 2);
    expect(changes).toEqual(1);
  });

  test("a device without a caret does not hide its identity's caret elsewhere", async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const focused = network.createProvider('identity');
    const blurred = network.createProvider('identity');
    blurred.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    focused.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'a', head: 'a' });
  });

  test("an empty cursor pair does not hide its identity's caret", async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const focused = network.createProvider('identity');
    const unavailable = network.createProvider('identity');
    focused.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    unavailable.update({ anchor: '', head: '' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'a', head: 'a' });
  });

  test('the caret that moved last stays when both devices re-announce', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const later = network.createProvider('identity');
    const earlier = network.createProvider('identity');
    earlier.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    later.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'b', head: 'b' });
  });

  test('a lost blur is re-announced', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const peer = network.createProvider('peer');
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toBeDefined();

    network.connected = false;
    peer.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    network.connected = true;
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);
    expect(observer.getRemoteStates()[0]?.position).toBeUndefined();
  });

  test('a repeated update without a caret is not posted', async ({ expect }) => {
    const network = new TestNetwork();
    const messenger = network.createMessenger();
    const postMessage = vi.spyOn(messenger, 'postMessage');
    const peer = new SpaceAwarenessProvider({
      messenger,
      channel: CHANNEL,
      peerId: 'peer',
      info: { displayName: 'peer', darkColor: 'red', lightColor: 'red' },
    });
    peer.open();
    onTestFinished(() => peer.close());
    await vi.advanceTimersByTimeAsync(SETTLE);
    const posts = () => postMessage.mock.calls.filter(([, json]) => json.kind === 'post').length;

    peer.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(posts()).toBe(1);
    peer.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(posts()).toBe(1);
  });

  test('a peer that reopens is answered at once', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createProvider('host');
    const guest = network.createProvider('guest');
    host.update({ anchor: 'a', head: 'a' });
    guest.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    host.close();

    network.connected = false;
    const reopened = network.createProvider('host');
    await vi.advanceTimersByTimeAsync(SETTLE);
    network.connected = true;
    reopened.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(reopened)).toEqual(['guest']);
  });

  test('a closed peer is removed', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const peer = network.createProvider('peer');
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(observer)).toEqual(['peer']);

    peer.close();
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(observer)).toEqual([]);
  });

  test('a peer that goes quiet expires', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const peer = network.createProvider('peer');
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    network.connected = false;
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL * 2);
    expect(peerIds(observer)).toEqual(['peer']);
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL * 2);
    expect(peerIds(observer)).toEqual([]);
  });

  test('a late observer shows the caret that moved last, whatever order replies arrive in', async ({ expect }) => {
    const network = new TestNetwork();
    // Both answer the observer's query in the same tick; arrival alone would keep the first, stored first.
    const earlier = network.createProvider('identity');
    const later = network.createProvider('identity');
    earlier.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    later.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    const observer = network.createProvider('observer');
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'b', head: 'b' });
  });

  test('nothing is posted after leaving', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const peer = network.createProvider('peer');
    await vi.advanceTimersByTimeAsync(SETTLE);
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(10);
    // Waits on the post in flight; close() can no longer cancel it.
    peer.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(1);
    peer.close();
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(observer)).toEqual([]);
  });

  test('a reopened provider does not re-announce its old caret', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const peer = network.createProvider('peer');
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    peer.close();
    peer.open();
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL + SETTLE);
    expect(peerIds(observer)).toEqual([]);
  });

  test('a post in flight when the provider reopens does not revive the closed session', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const peer = network.createProvider('peer');
    await vi.advanceTimersByTimeAsync(SETTLE);
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(10);
    peer.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(1);
    peer.close();
    peer.open();
    peer.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    peer.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toBeUndefined();
  });

  test('repeating an unchanged caret does not make it the latest', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const idle = network.createProvider('identity');
    const typing = network.createProvider('identity');
    idle.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    typing.update({ anchor: 'b', head: 'b' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    // As when a remote edit shifts the caret's offset but not its cursor.
    idle.update({ anchor: 'a', head: 'a' }, { moved: false });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'b', head: 'b' });

    const late = network.createProvider('late');
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(late.getRemoteStates().find((state) => state.peerId === 'identity')?.position).toEqual({
      anchor: 'b',
      head: 'b',
    });
  });

  test('typing counts as a change though the cursor stays put', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const typing = network.createProvider('identity');
    const other = network.createProvider('identity');
    typing.update({ anchor: 'end', head: 'end' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    other.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    let changes = 0;
    observer.remoteStateChange.on(() => {
      changes++;
    });

    // Text typed at the end of the document leaves the caret's cursor at 'end'.
    typing.update({ anchor: 'end', head: 'end' });
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'end', head: 'end' });
    expect(changes).toEqual(1);
  });

  test('one lost re-announce does not expire a peer', async ({ expect }) => {
    const network = new TestNetwork();
    const peer = network.createProvider('peer');
    peer.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(50);
    // Ticks 50 ms after the peer re-announces.
    const observer = network.createProvider('observer');
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);

    network.connected = false;
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);
    network.connected = true;
    network.delay = 200;
    // Past the observer's tick and before the delayed re-announce arrives.
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL);
    expect(peerIds(observer)).toEqual(['peer']);
  });

  test("a session replaces its identity's state from an older client", async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    await vi.advanceTimersByTimeAsync(SETTLE);
    await network.createMessenger().postMessage(CHANNEL, {
      kind: 'post',
      state: { peerId: 'identity', info: { displayName: 'identity' }, position: { anchor: 'a', head: 'a' } },
    });
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL * 4);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'a', head: 'a' });

    const current = network.createProvider('identity');
    current.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toBeUndefined();
  });

  test('an older client that moved last keeps its caret', async ({ expect }) => {
    const network = new TestNetwork();
    const observer = network.createProvider('observer');
    const current = network.createProvider('identity');
    current.update(undefined);
    await vi.advanceTimersByTimeAsync(SETTLE);
    await network.createMessenger().postMessage(CHANNEL, {
      kind: 'post',
      state: { peerId: 'identity', info: { displayName: 'identity' }, position: { anchor: 'a', head: 'a' } },
    });
    await vi.advanceTimersByTimeAsync(ANNOUNCE_INTERVAL + SETTLE);
    expect(observer.getRemoteStates()[0]?.position).toEqual({ anchor: 'a', head: 'a' });
  });

  test('a failed post does not stop the provider', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createProvider('host');
    await vi.advanceTimersByTimeAsync(SETTLE);
    network.failNextPost = new Error('timeout');
    host.update({ anchor: 'a', head: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE);

    const guest = network.createProvider('guest');
    await vi.advanceTimersByTimeAsync(SETTLE);
    expect(peerIds(guest)).toEqual(['host']);
  });
});

const peerIds = (provider: SpaceAwarenessProvider) => provider.getRemoteStates().map((state) => state.peerId);
