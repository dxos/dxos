//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Draft from '../Draft.ts';
import {
  MemoryTabHost,
  type Shape,
  type Tab,
  TabNetwork,
  canon,
  initialShape,
  randomEdit,
  seeded,
  unknownTo,
} from '../testing/index.ts';
import { encodeChange } from './encode.ts';

const PEER = 'eeee0000eeee0000eeee0000eeee0000';

const hashes = (doc: A.Doc<unknown>): string[] => A.getAllChanges(doc).map((change) => A.decodeChange(change).hash);

const exported = (doc: A.Doc<unknown>): Map<string, Uint8Array> =>
  new Map(A.getAllChanges(doc).map((bytes) => [A.decodeChange(bytes).hash, bytes]));

/** Random edits from `tabs` and `peer`, delivered and applied in a random order. */
const churn = (
  host: MemoryTabHost,
  network: TabNetwork,
  tabs: Tab<Shape>[],
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
      current = A.merge(current, A.clone(host.doc<Shape>('doc')));
    } else {
      network.deliver(1 + pick(network.pending + 1));
    }
  }
  return current;
};

describe('heads read right after a write', () => {
  test('are the hash of the change just written, and the host ends up with exactly those heads', () => {
    const host = new MemoryTabHost();
    host.create('doc', { content: 'hello', title: new A.ImmutableString('t') });
    const network = new TabNetwork(host);
    const left = network.open<Shape>('doc');
    const right = network.open<Shape>('doc');

    left.tab.change((draft) => Draft.splice(draft, ['content'], 5, 0, ' world'));
    const heads = left.tab.heads();
    expect(heads).toEqual([left.tab.pending[0].hash]);
    expect(heads[0]).toMatch(/^[0-9a-f]{64}$/);
    // Nothing has been delivered yet.
    expect(A.hasHeads(host.doc('doc'), heads)).toBe(false);
    expect(right.tab.hasHeads(heads)).toBe(false);

    network.settle();
    expect(A.getHeads(host.doc('doc'))).toEqual(heads);
    expect(right.tab.heads()).toEqual(heads);
    const atHeads = canon(A.toJS(A.view(host.doc('doc'), heads)));
    expect(canon(left.tab.view(heads))).toBe(atHeads);
    expect(canon(right.tab.view(heads))).toBe(atHeads);
    // The host exports the change under the same hash, so a save round-trips and peers can reach it.
    expect(A.getHeads(A.load(A.save(host.doc('doc'))))).toEqual(heads);
  });

  test('every version a tab reads right after a write, over random concurrent edits, is one the host has', () => {
    for (const seed of [11, 12, 13, 14]) {
      const random = seeded(seed);
      const { rand, pick } = random;
      const host = new MemoryTabHost();
      host.create('doc', initialShape());
      const network = new TabNetwork(host);
      const tabs = [network.open<Shape>('doc'), network.open<Shape>('doc'), network.open<Shape>('doc')];
      let peer = A.clone(host.doc<Shape>('doc'), { actor: PEER });
      const versions: { heads: string[]; state: string }[] = [];
      const written = new Set<string>();

      for (let step = 0; step < 100; step++) {
        const roll = rand();
        if (roll < 0.6) {
          const tab = tabs[pick(tabs.length)];
          const heads = tab.tab.change(randomEdit(random));
          if (heads) {
            written.add(heads[0]);
            versions.push({ heads: tab.tab.heads(), state: canon(tab.tab.doc()) });
          }
        } else if (roll < 0.7) {
          peer = A.change(peer, (draft) => {
            draft.title = new A.ImmutableString(`peer ${step}`);
          });
        } else if (roll < 0.8) {
          host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
        } else if (roll < 0.85) {
          host.flush();
          peer = A.merge(peer, A.clone(host.doc<Shape>('doc')));
        } else {
          network.deliver(1 + pick(network.pending + 1));
        }
      }
      network.settle();

      const doc = host.doc('doc');
      for (const { heads, state } of versions) {
        expect(A.hasHeads(doc, heads)).toBe(true);
        expect(canon(A.toJS(A.view(doc, heads)))).toBe(state);
        for (const tab of tabs) {
          expect(canon(tab.tab.view(heads))).toBe(state);
        }
      }
      // Every change a tab wrote is exported under the hash its heads carried.
      const saved = new Set(hashes(A.load(A.save(doc))));
      expect([...written].filter((hash) => !saved.has(hash))).toEqual([]);
      expect(versions.length).toBeGreaterThan(40);
    }
  });

  test('refusals name changes by hash, so a late refusal cannot drop a later change that reused the seq', () => {
    const host = new MemoryTabHost();
    host.create('doc', { content: 'abc' });
    const network = new TabNetwork(host);
    const tab = network.open<Shape>('doc');
    const rejected: string[][] = [];
    tab.tab.onRejected((changes) => rejected.push(changes.map((change) => change.hash)));
    let refuseNext = true;
    host.refuseWhen = () => {
      const refuse = refuseNext;
      refuseNext = false;
      return refuse;
    };

    const [first] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 3, 0, '1')) ?? [];
    const [second] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 4, 0, '2')) ?? [];
    // The host refuses the first, then the second for depending on it.
    network.deliver(2);
    // The tab takes the first refusal and drops both.
    network.deliver(1);
    expect(rejected).toEqual([[first, second]]);
    expect(tab.tab.doc().content).toBe('abc');

    // Two new changes reuse seqs 1 and 2 before the second refusal arrives.
    const [third] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 0, 0, 'x')) ?? [];
    const [fourth] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 0, 0, 'y')) ?? [];
    expect(tab.tab.pending.map((change) => change.seq)).toEqual([1, 2]);
    // The late refusal of `second`, seq 2, matches nothing.
    network.deliver(1);
    expect(tab.tab.pending.map((change) => change.hash)).toEqual([third, fourth]);

    network.settle();
    expect(tab.tab.pending).toHaveLength(0);
    expect(host.doc<Shape>('doc').content).toBe('yxabc');
    expect(tab.tab.doc().content).toBe('yxabc');
    expect(A.getHeads(host.doc('doc'))).toEqual([fourth]);
    expect(rejected).toHaveLength(1);
  });

  test('the host applies a burst of tab changes in one Automerge call', () => {
    const host = new MemoryTabHost();
    host.create('doc', initialShape());
    const network = new TabNetwork(host);
    const tab = network.open<Shape>('doc');
    for (let i = 0; i < 50; i++) {
      tab.tab.change((draft) => Draft.splice(draft, ['content'], draft.content.length, 0, 'x'));
    }
    const before = host.applyCalls;
    network.settle();
    expect(host.applyCalls - before).toBe(1);
    expect(host.doc<Shape>('doc').content).toBe(`hello world${'x'.repeat(50)}`);
  });
});

describe('recovery after the host restarts', () => {
  test('every change a tab holds, whether it wrote, received or loaded it, rebuilds to the exact bytes the host exports', () => {
    for (const seed of [21, 22, 23]) {
      const random = seeded(seed);
      const host = new MemoryTabHost();
      host.create('doc', initialShape());
      const network = new TabNetwork(host);
      const tabs = [network.open<Shape>('doc'), network.open<Shape>('doc')];
      let peer = A.clone(host.doc<Shape>('doc'), { actor: PEER });
      peer = churn(host, network, tabs, peer, random, 80);
      network.settle();
      host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
      network.settle();
      // A tab opened now reads every earlier change from saved bytes, deletes included.
      tabs.push(network.open<Shape>('doc'));
      churn(host, network, tabs, peer, random, 40);
      network.settle();

      const stored = exported(host.doc('doc'));
      for (const tab of tabs) {
        const held = tab.tab.model.changeHashes();
        expect(held.length).toBe(stored.size);
        for (const hash of held) {
          expect(encodeChange(tab.tab.model.changeOf(hash)).bytes).toEqual(stored.get(hash));
        }
      }
    }
  });

  test('after an abrupt restart that loses unsaved work, tabs resend and relay what they hold and all converge', () => {
    let relayedPeerChanges = 0;
    for (const seed of [31, 32, 33, 34]) {
      const random = seeded(seed);
      const host = new MemoryTabHost();
      host.create('doc', initialShape());
      host.persistOnFlush = false;
      const network = new TabNetwork(host);
      const left = network.open<Shape>('doc');
      const right = network.open<Shape>('doc');
      const closing = network.open<Shape>('doc');
      let peer = A.clone(host.doc<Shape>('doc'), { actor: PEER });

      // Saved work, acknowledged.
      peer = churn(host, network, [left, right, closing], peer, random, 40);
      network.settle();
      host.persist('doc');
      network.settle();

      // Unsaved work: flushed to other tabs but not saved, including a tab that then closes and a peer.
      peer = churn(host, network, [left, right, closing], peer, random, 60);
      closing.tab.change((draft) => Draft.splice(draft, ['content'], 0, 0, 'from a closed tab '));
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

      const doc = host.doc<Shape>('doc');
      expect([...held].filter((hash) => !A.hasHeads(doc, [hash]))).toEqual([]);
      for (const tab of [left, right]) {
        expect(tab.tab.pending).toHaveLength(0);
        expect(canon(tab.tab.doc())).toBe(canon(A.toJS(A.load(A.save(doc)))));
      }
      expect(doc.content).toContain('from a closed tab');
      expect(lost.some((hash) => closing.tab.model.changeMeta(hash)?.actor === closing.tab.actor)).toBe(true);

      // Peer changes the restart lost came back through the tabs under the peer's own hashes, so the
      // peer's next sync neither repeats them nor collides on their seqs.
      relayedPeerChanges += lost.filter((hash) => peerHeld.has(hash)).length;
      peer = A.change(A.merge(peer, A.clone(doc)), (draft) => {
        A.splice(draft, ['content'], 0, 0, 'after ');
      });
      const toHost = unknownTo(doc, peer);
      expect(toHost.map((bytes) => A.decodeChange(bytes).hash).filter((hash) => held.has(hash))).toEqual([]);
      host.applyRemote('doc', toHost);
      left.tab.change((draft) => Draft.splice(draft, ['content'], 0, 0, 'later '));
      network.settle();
      const final = canon(A.toJS(A.load(A.save(host.doc('doc')))));
      expect(canon(left.tab.doc())).toBe(final);
      expect(canon(right.tab.doc())).toBe(final);
    }
    expect(relayedPeerChanges).toBeGreaterThan(0);
  });

  test('a change the host saved just before it died is confirmed on reconnect, not sent again', () => {
    const host = new MemoryTabHost();
    host.create('doc', { content: 'abc' });
    const network = new TabNetwork(host);
    const left = network.open<Shape>('doc');
    const right = network.open<Shape>('doc');
    const [hash] = left.tab.change((draft) => Draft.splice(draft, ['content'], 3, 0, 'd')) ?? [];
    network.deliver(network.pending);
    // Applies, forwards to `right`, saves, and queues the ack to `left`.
    host.flush();
    // The host dies before either message leaves.
    network.drop();
    host.restart();
    expect(left.tab.pending.map((change) => change.hash)).toEqual([hash]);
    expect(right.tab.doc().content).toBe('abc');

    network.reconnect(left);
    network.reconnect(right);
    expect(left.tab.pending).toHaveLength(0);
    expect(network.pending).toBe(0);
    expect(right.tab.doc().content).toBe('abcd');
    expect(A.getHeads(host.doc('doc'))).toEqual([hash]);
  });
});
