//
// Copyright 2026 DXOS.org
//

import { type JsonObject, create } from '@bufbuild/protobuf';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, onTestFinished, test } from 'vitest';

import { type ListenHandle, type Messenger } from '@dxos/protocols';
import { packJson } from '@dxos/protocols/buf';
import { type GossipMessage, GossipMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

import { bindAwareness, createGridAwareness } from './awareness.ts';
import { GridSelectionModel } from './selection-model.ts';

/** Gossip between peers in one process, delivered to every other peer's ready listener. */
const createNetwork = () => {
  const listeners = new Set<{ peer: string; callback: (message: GossipMessage) => void }>();
  return (peer: string): Messenger => ({
    listen: (_channel, callback) => {
      const listener = { peer, callback };
      listeners.add(listener);
      const handle: ListenHandle = Object.assign(() => void listeners.delete(listener), { ready: Promise.resolve() });
      return handle;
    },
    postMessage: async (channelId: string, json: JsonObject) => {
      const message = create(GossipMessageSchema, { channelId, payload: packJson(json) });
      for (const listener of [...listeners].filter((listener) => listener.peer !== peer)) {
        listener.callback(message);
      }
    },
  });
};

const createPeer = (messenger: Messenger, peerId: string, hue: string) => {
  const registry = Registry.make();
  const model = new GridSelectionModel(registry);
  const channel = createGridAwareness({
    messenger,
    objectId: 'grid',
    peer: { peerId, info: { displayName: peerId, darkColor: '', lightColor: '', hue } },
  });
  const unbind = bindAwareness(registry, model, channel);
  onTestFinished(unbind);
  return { model, unbind };
};

const aliceSelection = { anchor: { col: 'name', row: 'o1' }, head: { col: 'email', row: 'o2' } };

describe('bindAwareness', () => {
  test("a peer sees another's selection by cell identity, in their hue, until they leave", async ({ expect }) => {
    const network = createNetwork();
    const alice = createPeer(network('alice'), 'alice', 'amber');
    const bob = createPeer(network('bob'), 'bob', 'sky');

    alice.model.select(aliceSelection);
    await expect
      .poll(() => bob.model.getPeers())
      .toEqual([
        {
          peerId: 'alice',
          name: 'alice',
          color: 'var(--color-amber-border)',
          textColor: 'var(--color-amber-fg)',
          selection: aliceSelection,
        },
      ]);

    alice.unbind();
    await expect.poll(() => bob.model.getPeers()).toEqual([]);
  });

  test('a member with two tabs open shows once, at the tab with a selection', async ({ expect }) => {
    const network = createNetwork();
    const aliceSelecting = createPeer(network('alice-1'), 'alice', 'amber');
    createPeer(network('alice-2'), 'alice', 'amber');
    const bob = createPeer(network('bob'), 'bob', 'sky');

    aliceSelecting.model.select(aliceSelection);
    await expect
      .poll(() => bob.model.getPeers().map(({ peerId, selection }) => ({ peerId, selection })))
      .toEqual([{ peerId: 'alice', selection: aliceSelection }]);
  });
});
