//
// Copyright 2026 DXOS.org
//

import { type JsonObject, create } from '@bufbuild/protobuf';
import { afterEach, describe, onTestFinished, test, vi } from 'vitest';

import { type ListenHandle, type Messenger } from '@dxos/protocols';
import { packJson } from '@dxos/protocols/buf';
import { type GossipMessage, GossipMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

import { SpaceAwarenessProvider } from './awareness-provider.ts';

const LISTEN_DELAY = 10;
const NETWORK_DELAY = 1;

/**
 * Gossip as a space delivers it: only to peers connected when a message is sent, never replayed, and
 * dropped by a listener that is not yet registered.
 */
class TestNetwork {
  connected = true;

  private readonly _listeners = new Set<{ peer: string; ready: boolean; callback: (message: GossipMessage) => void }>();

  createMessenger(peer: string): Messenger {
    return {
      listen: (_channel, callback) => {
        const listener = { peer, ready: false, callback };
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
        if (!this.connected) {
          return;
        }
        const message = create(GossipMessageSchema, { channelId, payload: packJson(json) });
        const recipients = [...this._listeners].filter((listener) => listener.peer !== peer);
        setTimeout(() => {
          for (const listener of recipients) {
            if (listener.ready && this._listeners.has(listener)) {
              listener.callback(message);
            }
          }
        }, NETWORK_DELAY);
      },
    };
  }

  createProvider(peer: string): SpaceAwarenessProvider {
    const provider = new SpaceAwarenessProvider({
      messenger: this.createMessenger(peer),
      channel: 'awareness.test',
      peerId: peer,
      info: { displayName: peer, darkColor: 'red', lightColor: 'red' },
    });
    provider.open();
    onTestFinished(() => provider.close());
    return provider;
  }
}

const peerIds = (provider: SpaceAwarenessProvider) => provider.getRemoteStates().map((state) => state.peerId);

describe('SpaceAwarenessProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('a peer that opens later receives existing state', async ({ expect }) => {
    const network = new TestNetwork();
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });

    const guest = network.createProvider('guest');
    await expect.poll(() => peerIds(guest)).toEqual(['host']);
  });

  test('state reaches a peer whose connection forms after the last post', async ({ expect }) => {
    const network = new TestNetwork();
    network.connected = false;
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });
    const guest = network.createProvider('guest');
    await new Promise((resolve) => setTimeout(resolve, LISTEN_DELAY * 2));

    network.connected = true;
    guest.update({ anchor: 'b', head: 'b' });
    await expect.poll(() => peerIds(host)).toEqual(['guest']);
    await expect.poll(() => peerIds(guest)).toEqual(['host']);
  });

  test('state is re-announced for a peer that never posts', async ({ expect }) => {
    vi.useFakeTimers();
    const network = new TestNetwork();
    network.connected = false;
    const host = network.createProvider('host');
    host.update({ anchor: 'a', head: 'a' });
    const guest = network.createProvider('guest');
    await vi.advanceTimersByTimeAsync(LISTEN_DELAY * 2);
    expect(peerIds(guest)).toEqual([]);

    network.connected = true;
    await vi.advanceTimersByTimeAsync(15_000);
    expect(peerIds(guest)).toEqual(['host']);
  });
});
