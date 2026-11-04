//
// Copyright 2026 DXOS.org
//

import { type JsonObject, create } from '@bufbuild/protobuf';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, onTestFinished, test } from 'vitest';

import { type ListenHandle, type Messenger } from '@dxos/protocols';
import { packJson } from '@dxos/protocols/buf';
import { type GossipMessage, GossipMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';
import { SpaceAwarenessProvider } from '@dxos/ui-editor';

import { bindAwareness, decodeCellId, encodeCellId } from './awareness.ts';
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
  const provider = new SpaceAwarenessProvider({
    messenger,
    channel: 'awareness.grid',
    peerId,
    info: { displayName: peerId, darkColor: '', lightColor: '', hue },
  });
  const unbind = bindAwareness(registry, model, provider);
  onTestFinished(unbind);
  return { model, unbind };
};

describe('bindAwareness', () => {
  test('cell identities survive the round trip, ids with any characters included', ({ expect }) => {
    const id = { col: 'a:b,"c"', row: '01J@x' };
    expect(decodeCellId(encodeCellId(id))).toEqual(id);
    expect(decodeCellId('A1')).toBe(undefined);
    expect(decodeCellId(JSON.stringify([1, 2]))).toBe(undefined);
  });

  test("a peer sees another's selection by cell identity, in their hue, until they leave", async ({ expect }) => {
    const network = createNetwork();
    const alice = createPeer(network('alice'), 'alice', 'amber');
    const bob = createPeer(network('bob'), 'bob', 'sky');

    alice.model.select({ anchor: { col: 'name', row: 'o1' }, head: { col: 'email', row: 'o2' } });
    await expect
      .poll(() => bob.model.getPeers())
      .toEqual([
        {
          peerId: 'alice',
          name: 'alice',
          color: 'var(--color-amber-border)',
          textColor: 'var(--color-amber-fg)',
          selection: { anchor: { col: 'name', row: 'o1' }, head: { col: 'email', row: 'o2' } },
        },
      ]);

    alice.unbind();
    await expect.poll(() => bob.model.getPeers()).toEqual([]);
  });
});
