//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Draft from '@dxos/automerge-proxy/Draft';

import { encodeChange } from './encode.ts';
import { SpikeHost } from './host.ts';
import { Network, type Tab } from './network.ts';
import { type Shape, canon, initialShape, randomEdit, seeded, unknownTo } from './testing.ts';

const PEER = 'eeee0000eeee0000eeee0000eeee0000';

/** Random edits from `tabs` and `peer`, delivered and applied in a random order. */
const churn = (
  host: SpikeHost,
  network: Network,
  tabs: Tab[],
  peer: A.Doc<Shape>,
  random: ReturnType<typeof seeded>,
  steps: number,
): A.Doc<Shape> => {
  const { rand, pick } = random;
  let current = peer;
  for (let step = 0; step < steps; step++) {
    const roll = rand();
    if (roll < 0.6) {
      tabs[pick(tabs.length)].tab.change(randomEdit(random));
    } else if (roll < 0.7) {
      current = A.change(current, (draft) => {
        A.splice(draft, ['content'], 0, 0, 'P');
      });
    } else if (roll < 0.78) {
      host.applyRemote('doc', unknownTo(host.doc('doc'), current));
    } else if (roll < 0.84) {
      host.flush();
      current = A.merge(current, A.clone(host.doc('doc')));
    } else {
      network.deliver(1 + pick(network.pending + 1));
    }
  }
  return current;
};

const exported = (doc: A.Doc<unknown>): Map<string, Uint8Array> =>
  new Map(A.getAllChanges(doc).map((bytes) => [A.decodeChange(bytes).hash, bytes]));

describe('recovery after the worker restarts', () => {
  test('every change a tab holds, whether it wrote, received or loaded it, rebuilds to the exact bytes the worker exports', () => {
    for (const seed of [21, 22, 23]) {
      const random = seeded(seed);
      const host = new SpikeHost();
      host.create('doc', initialShape());
      const network = new Network(host);
      const tabs = [network.open('doc'), network.open('doc')];
      let peer = A.clone(host.doc('doc'), { actor: PEER });
      peer = churn(host, network, tabs, peer, random, 80);
      network.settle();
      host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
      network.settle();
      // A tab opened now reads every earlier change from saved bytes, deletes included.
      tabs.push(network.open('doc'));
      churn(host, network, tabs, peer, random, 40);
      network.settle();

      const worker = exported(host.doc('doc'));
      for (const tab of tabs) {
        const hashes = tab.tab.model.changeHashes();
        expect(hashes.length).toBe(worker.size);
        for (const hash of hashes) {
          const { bytes } = encodeChange(tab.tab.model.changeOf(hash));
          expect(bytes).toEqual(worker.get(hash));
        }
      }
    }
  });

  test('after an abrupt restart that loses unsaved work, tabs resend and relay what they hold and all converge', () => {
    let relayedPeerChanges = 0;
    for (const seed of [31, 32, 33, 34]) {
      const random = seeded(seed);
      const host = new SpikeHost();
      host.create('doc', initialShape());
      host.persistOnFlush = false;
      const network = new Network(host);
      const left = network.open('doc');
      const right = network.open('doc');
      const closing = network.open('doc');
      let peer = A.clone(host.doc('doc'), { actor: PEER });

      // Saved work, acknowledged.
      peer = churn(host, network, [left, right, closing], peer, random, 40);
      network.settle();
      host.persist('doc');
      network.settle();

      // Unsaved work: flushed to other tabs but not saved, including a tab that then closes and a peer.
      peer = churn(host, network, [left, right, closing], peer, random, 60);
      closing.tab.change((draft: Shape) => Draft.splice(draft, ['content'], 0, 0, 'from a closed tab '));
      network.deliver(network.pending);
      host.flush();
      network.deliver(network.pending);
      const held = new Set([...left.tab.model.changeHashes(), ...right.tab.model.changeHashes()]);
      const peerHeld = new Set(A.getAllChanges(peer).map((bytes) => A.decodeChange(bytes).hash));

      host.restart();
      network.drop();
      const lost = [...held].filter((hash) => !A.hasHeads(host.doc('doc'), [hash]));
      expect(lost.length).toBeGreaterThan(0);

      host.persistOnFlush = true;
      network.reconnect(left);
      network.reconnect(right);
      network.settle();

      const doc = host.doc('doc');
      expect([...held].filter((hash) => !A.hasHeads(doc, [hash]))).toEqual([]);
      for (const tab of [left, right]) {
        expect(tab.tab.pending).toHaveLength(0);
        expect(canon(tab.handle.doc())).toBe(canon(A.toJS(A.load(A.save(doc)))));
      }
      expect(doc.content).toContain('from a closed tab');
      expect(lost.some((hash) => closing.tab.model.changeMeta(hash)?.actor === closing.tab.actor)).toBe(true);

      // Peer changes the restart lost came back through the tabs under the peer's own hashes, so the
      // peer's next sync neither repeats them nor collides on their seqs.
      relayedPeerChanges += lost.filter((hash) => peerHeld.has(hash)).length;
      peer = A.change(A.merge(peer, A.clone(doc)), (draft) => {
        A.splice(draft, ['content'], 0, 0, 'after ');
      });
      const toWorker = unknownTo(doc, peer);
      expect(toWorker.map((bytes) => A.decodeChange(bytes).hash).filter((hash) => held.has(hash))).toEqual([]);
      host.applyRemote('doc', toWorker);
      left.tab.change((draft: Shape) => Draft.splice(draft, ['content'], 0, 0, 'later '));
      network.settle();
      const final = canon(A.toJS(A.load(A.save(host.doc('doc')))));
      expect(canon(left.handle.doc())).toBe(final);
      expect(canon(right.handle.doc())).toBe(final);
    }
    expect(relayedPeerChanges).toBeGreaterThan(0);
  });

  test('a change the worker saved just before it died is confirmed on reconnect, not sent again', () => {
    const host = new SpikeHost();
    host.create('doc', { content: 'abc' });
    const network = new Network(host);
    const left = network.open('doc');
    const right = network.open('doc');
    const [hash] = left.tab.change((draft: Shape) => Draft.splice(draft, ['content'], 3, 0, 'd')) ?? [];
    network.deliver(network.pending);
    host.flush(); // Applies, broadcasts to `right`, saves, and queues the ack to `left`.
    network.drop(); // The worker dies before either message leaves.
    host.restart();
    expect(left.tab.pending.map((change) => change.hash)).toEqual([hash]);
    expect(right.handle.doc().content).toBe('abc');

    network.reconnect(left);
    network.reconnect(right);
    expect(left.tab.pending).toHaveLength(0);
    expect(network.pending).toBe(0);
    expect(right.handle.doc().content).toBe('abcd');
    expect(A.getHeads(host.doc('doc'))).toEqual([hash]);
  });
});
