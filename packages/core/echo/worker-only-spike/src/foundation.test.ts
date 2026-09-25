//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Draft from '@dxos/automerge-proxy/Draft';

import { SpikeHost } from './host.ts';
import { Network, type Tab } from './network.ts';
import { type Shape, boundary, canon, initialShape, randomEdit, seeded, unknownTo } from './testing.ts';

describe('tab documents over a worker', () => {
  test('a cursor minted before the worker saw the text is the id Automerge gives it', () => {
    const host = new SpikeHost();
    host.create('doc', initialShape());
    const network = new Network(host);
    const left = network.open('doc');
    const right = network.open('doc');

    left.handle.change((draft: Shape) => Draft.splice(draft, ['content'], 5, 0, ', dear'));
    // Nothing has been delivered: the worker has not seen the text the cursor points into.
    const cursor = left.tab.cursor(left.tab.heads(), ['content'], 7);
    expect(left.handle.doc().content[7]).toBe('d');

    network.settle();
    const hostDoc = host.doc('doc');
    expect(hostDoc.content).toBe('hello, dear world');
    expect(A.getCursorPosition(hostDoc, ['content'], cursor)).toBe(7);
    expect(right.tab.cursorPosition(right.tab.heads(), ['content'], cursor)).toBe(7);
    expect(right.handle.doc().content).toBe('hello, dear world');
  });

  test('random concurrent edits from tabs and another peer converge, with every cursor exact', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const random = seeded(seed);
      const { rand, pick } = random;
      const host = new SpikeHost();
      host.create('doc', initialShape());
      const network = new Network(host);
      const tabs: Tab[] = [network.open('doc'), network.open('doc'), network.open('doc')];
      let peer = A.clone(host.doc('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
      const minted: { cursor: string; tab: Tab }[] = [];
      const initialHeads = A.getHeads(host.doc('doc'));
      let midHeads = initialHeads;

      for (let step = 0; step < 80; step++) {
        const r = rand();
        if (r < 0.6) {
          const tab = tabs[pick(tabs.length)];
          tab.handle.change(randomEdit(random));
          const text = tab.handle.doc().content as string;
          if (text.length > 0) {
            minted.push({ cursor: tab.tab.cursor(tab.tab.heads(), ['content'], pick(text.length)), tab });
          }
        } else if (r < 0.7) {
          peer = A.change(peer, (draft: Shape) => {
            A.splice(draft, ['content'], boundary(draft.content, pick(draft.content.length + 1)), 0, 'P');
            draft.title = new A.ImmutableString('peer');
          });
        } else if (r < 0.8) {
          host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
        } else if (r < 0.85) {
          host.flush();
          peer = A.merge(peer, A.clone(host.doc('doc')));
          if (step < 40) {
            midHeads = A.getHeads(host.doc('doc'));
          }
        } else {
          network.deliver(1 + pick(network.pending + 1));
        }
      }
      network.settle();
      host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
      network.settle();

      const fresh = A.load<Shape>(A.save(host.doc('doc')));
      const expected = canon(A.toJS(fresh));
      for (const tab of tabs) {
        expect(canon(tab.handle.doc())).toBe(expected);
        expect(tab.tab.pending).toHaveLength(0);
      }
      // Every character's id matches Automerge's, in every tab.
      const text = fresh.content;
      for (let position = 0; position < text.length; position++) {
        const id = A.getCursor(fresh, ['content'], position);
        for (const tab of tabs) {
          expect(tab.tab.cursor(tab.tab.heads(), ['content'], position)).toBe(id);
        }
      }
      // Patches between versions, in Automerge's order.
      for (const [from, to] of [
        [initialHeads, A.getHeads(fresh)],
        [midHeads, A.getHeads(fresh)],
        [initialHeads, midHeads],
      ]) {
        const want = A.diff(fresh, from, to);
        for (const tab of tabs) {
          expect(tab.tab.diff(from, to)).toEqual(want);
        }
      }
      // Cursors minted the moment their text was typed resolve as Automerge resolves them.
      for (const { cursor } of minted) {
        const want = A.getCursorPosition(fresh, ['content'], cursor);
        for (const tab of tabs) {
          expect(tab.tab.cursorPosition(tab.tab.heads(), ['content'], cursor)).toBe(want);
        }
      }
    }
  });

  test('the worker applies a burst of tab changes in one Automerge call', () => {
    const host = new SpikeHost();
    host.create('doc', initialShape());
    const network = new Network(host);
    const tab = network.open('doc');
    for (let i = 0; i < 50; i++) {
      tab.handle.change((draft: Shape) => Draft.splice(draft, ['content'], draft.content.length, 0, 'x'));
    }
    const before = host.applyCalls;
    network.settle();
    expect(host.applyCalls - before).toBe(1);
    expect(host.doc('doc').content).toBe(`hello world${'x'.repeat(50)}`);
  });
});
