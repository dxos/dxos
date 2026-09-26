//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { decodeChange } from './host.ts';
import { Model } from './model.ts';
import { saveNoCompress } from './save.ts';
import { canon, seeded } from './testing.ts';

type Doc = {
  title: A.ImmutableString;
  text: string;
  list: (number | A.ImmutableString)[];
  items: { name: string; done: boolean }[];
  meta: Record<string, number | string | null | Date>;
};

const ACTORS = [
  'aaaa0000aaaa0000aaaa0000aaaa0000',
  'bbbb0000bbbb0000bbbb0000bbbb0000',
  'cccc0000cccc0000cccc0000cccc0000',
];
const words = ['a', 'bc', 'é', '😀', 'xyz', ' '];
const keys = ['k1', 'k2', 'k3'];

/** A random edit of every kind the model must follow: text, lists, nested maps, scalars and deletes. */
const edit =
  ({ rand, pick }: ReturnType<typeof seeded>) =>
  (doc: Doc): void => {
    const roll = rand();
    if (roll < 0.35) {
      const length = doc.text.length;
      const at = pick(length + 1);
      // Automerge edits whole characters; keep splices off the middle of a surrogate pair.
      const start = at > 0 && (doc.text.charCodeAt(at) & 0xfc00) === 0xdc00 ? at - 1 : at;
      const remove = length > start && rand() < 0.3 ? ((doc.text.codePointAt(start) ?? 0) > 0xffff ? 2 : 1) : 0;
      A.splice(doc, ['text'], start, remove, rand() < 0.8 ? words[pick(words.length)] : '');
    } else if (roll < 0.5) {
      if (doc.list.length > 0 && rand() < 0.3) {
        doc.list.splice(pick(doc.list.length), 1);
      } else if (doc.list.length > 0 && rand() < 0.3) {
        doc.list[pick(doc.list.length)] = pick(100);
      } else {
        doc.list.splice(pick(doc.list.length + 1), 0, rand() < 0.5 ? pick(100) : new A.ImmutableString('s'));
      }
    } else if (roll < 0.65) {
      if (doc.items.length > 0 && rand() < 0.5) {
        const item = doc.items[pick(doc.items.length)];
        item.done = !item.done;
      } else {
        doc.items.push({ name: words[pick(words.length)], done: false });
      }
    } else if (roll < 0.85) {
      const key = keys[pick(keys.length)];
      const choice = pick(5);
      if (choice === 0) {
        delete doc.meta[key];
      } else {
        doc.meta[key] = [pick(1000), 'text', null, new Date(pick(1e6) * 1000)][choice - 1];
      }
    } else {
      doc.title = new A.ImmutableString(words[pick(words.length)]);
    }
  };

describe('the model against Automerge', () => {
  test('reads every sampled version, diff, conflict and cursor as Automerge does, loaded from saved bytes or from changes', () => {
    let versionsChecked = 0;
    let diffsChecked = 0;
    let conflictsSeen = 0;
    for (const seed of [51, 52, 53, 54, 55, 56]) {
      const random = seeded(seed);
      const { rand, pick } = random;
      let base = A.from<Doc>(
        { title: new A.ImmutableString('t'), text: 'hello', list: [], items: [], meta: {} },
        { actor: ACTORS[0] },
      );
      let peers = ACTORS.map((actor) => A.clone(base, { actor }));
      const versions: A.Heads[] = [A.getHeads(base)];
      for (let step = 0; step < 90; step++) {
        const index = pick(peers.length);
        peers[index] = A.change(peers[index], edit(random));
        if (rand() < 0.25) {
          const other = pick(peers.length);
          if (other !== index) {
            peers[other] = A.merge(peers[other], peers[index]);
          }
        }
        versions.push(A.getHeads(peers[index]));
      }
      base = peers.reduce((merged, peer) => A.merge(merged, peer), A.clone(peers[0]));
      versions.push(A.getHeads(base));
      const fresh = A.load<Doc>(A.save(base));
      const changes = A.getAllChanges(base);

      const fromBytes = Model.fromSaved(saveNoCompress(base));
      const fromChanges = new Model();
      changes.forEach((bytes) => fromChanges.applyChange(decodeChange(bytes)));

      for (const model of [fromBytes, fromChanges]) {
        // Values at sampled versions, including the final one.
        const sample = versions.filter((_heads, position) => position % 4 === 0 || position === versions.length - 1);
        for (const heads of sample) {
          expect(canon(model.materialize('_root', model.clockOf(heads)))).toBe(canon(A.toJS(A.view(fresh, heads))));
          versionsChecked++;
        }
        // Diffs between random pairs of versions, backwards and concurrent pairs included.
        for (let pair = 0; pair < 12; pair++) {
          const before = versions[pick(versions.length)];
          const after = versions[pick(versions.length)];
          expect(model.diff(model.clockOf(before), model.clockOf(after))).toEqual(A.diff(fresh, before, after));
          diffsChecked++;
        }
        // Conflicts at the current version.
        const clock = model.clockOf(A.getHeads(fresh));
        const metaId = model.objectAt(['meta'], clock);
        for (const key of keys) {
          const want = A.getConflicts(fresh.meta, key);
          conflictsSeen += want ? 1 : 0;
          expect(canon(metaId ? model.conflicts(metaId, key, clock) : undefined)).toBe(canon(want));
        }
        // A cursor at every text position, and its position back.
        const textId = model.objectAt(['text'], clock);
        expect(textId).toBeDefined();
        for (let position = 0; position < fresh.text.length; position++) {
          const cursor = A.getCursor(fresh, ['text'], position);
          if (textId) {
            expect(model.cursorAt(textId, position, clock)).toBe(cursor);
            expect(model.cursorPosition(textId, cursor, clock)).toBe(A.getCursorPosition(fresh, ['text'], cursor));
          }
        }
        // Every change rebuilds from the model as Automerge stores it.
        expect(model.changeHashes().sort()).toEqual(changes.map((bytes) => A.decodeChange(bytes).hash).sort());
      }
    }
    expect(versionsChecked).toBeGreaterThan(250);
    expect(diffsChecked).toBe(144);
    expect(conflictsSeen).toBeGreaterThan(0);
  });
});
