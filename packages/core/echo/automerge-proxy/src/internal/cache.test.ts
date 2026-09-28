//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Draft from '../Draft.ts';
import * as Op from '../Op.ts';
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
import { type TabDoc, tagOf } from './tab-doc.ts';

const PEER = 'eeee0000eeee0000eeee0000eeee0000';

/** The tab's value equals the model read afresh, and every container names itself at its own version. */
const check = (tab: TabDoc<Shape>) => {
  const doc = tab.doc();
  expect(canon(doc)).toBe(canon(tab.model.materialize('_root', tab.clockOf(tab.heads()))));
  expect(tagOf(doc)?.heads).toEqual(tab.heads());
  const walk = (node: unknown) => {
    if (!Op.isContainer(node)) {
      return;
    }
    expect(Object.isFrozen(node)).toBe(true);
    const tag = tagOf(node);
    expect(tag?.tab).toBe(tab);
    if (tag) {
      const clock = tab.clockOf(tag.heads);
      const objId = tab.model.objectAt(tag.path, clock);
      expect(objId === undefined ? undefined : canon(tab.model.materialize(objId, clock))).toBe(canon(node));
    }
    Object.values(node).forEach(walk);
  };
  walk(doc);
};

describe("a tab document's value, kept current change by change", () => {
  test('equals the model read afresh after local, older-version, remote, refused and merged changes', () => {
    let refused = 0;
    let olderVersions = 0;
    for (const seed of [41, 42, 43, 44]) {
      const random = seeded(seed);
      const { rand, pick } = random;
      const host = new MemoryTabHost();
      host.create('doc', initialShape());
      const network = new TabNetwork(host);
      const tabs: Tab<Shape>[] = [network.open<Shape>('doc'), network.open<Shape>('doc')];
      tabs.forEach((tab) => tab.tab.onRejected((changes) => (refused += changes.length)));
      const versions = new Map<Tab<Shape>, string[][]>(tabs.map((tab) => [tab, []]));
      let peer = A.clone(host.doc<Shape>('doc'), { actor: PEER });
      host.refuseWhen = () => rand() < 0.04;

      for (let step = 0; step < 150; step++) {
        const tab = tabs[pick(tabs.length)];
        const known = (versions.get(tab) ?? []).filter((heads) => heads.every((head) => tab.tab.model.hasChange(head)));
        const roll = rand();
        if (roll < 0.45) {
          tab.tab.change(randomEdit(random));
        } else if (roll < 0.55 && known.length > 0) {
          olderVersions++;
          tab.tab.changeAt(known[pick(known.length)], randomEdit(random));
        } else if (roll < 0.62) {
          peer = A.change(peer, (draft) => {
            A.splice(draft, ['content'], 0, 0, 'P');
            draft.tags.push(new A.ImmutableString('peer'));
          });
        } else if (roll < 0.7) {
          host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
        } else if (roll < 0.75) {
          host.flush();
          peer = A.merge(peer, A.clone(host.doc<Shape>('doc')));
        } else if (roll < 0.8) {
          // A merge in the tab: another tab document's changes arrive through `A.merge`'s path.
          const other = tabs.find((each) => each !== tab);
          if (other) {
            tab.tab.applyChanges(other.tab.changesIn(other.tab.heads()));
          }
        } else {
          network.deliver(1 + pick(network.pending + 1));
        }
        versions.get(tab)?.push(tab.tab.heads());
        tabs.forEach((each) => check(each.tab));
      }
      host.refuseWhen = undefined;
      network.settle();
      host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
      network.settle();
      const expected = canon(A.toJS(A.load(A.save(host.doc('doc')))));
      for (const tab of tabs) {
        check(tab.tab);
        expect(canon(tab.tab.doc())).toBe(expected);
      }
    }
    expect(refused).toBeGreaterThan(0);
    expect(olderVersions).toBeGreaterThan(20);
  });

  test("a write on the current version reports the draft's ops as patches, without diffing the document", () => {
    const host = new MemoryTabHost();
    host.create('doc', { content: 'hello' });
    const network = new TabNetwork(host);
    const tab = network.open<{ content: string }>('doc');
    const seen: unknown[] = [];
    tab.tab.on(({ patches, source }) => seen.push({ patches, source }));
    tab.tab.change((draft) => Draft.splice(draft, ['content'], 5, 0, '!'));
    expect(seen).toEqual([{ patches: [{ action: 'splice', path: ['content', 5], value: '!' }], source: 'change' }]);
  });
});
