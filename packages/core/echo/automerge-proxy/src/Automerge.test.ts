//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Automerge from './Automerge.ts';
import * as Handle from './Handle.ts';
import { canon, withoutAutomerge } from './testing/index.ts';

type Notes = { title: string; items: string[]; done?: boolean };

describe('documents a tab makes with no host behind them', () => {
  test('from, change, changeAt, clone, merge and save answer from the model; Automerge loads what save gives', () => {
    const { doc, other, saved, heads } = withoutAutomerge(() => {
      let doc = Automerge.from<Notes>({ title: 'Notes', items: ['a'] });
      doc = Automerge.change(doc, { message: 'add b' }, (draft) => {
        draft.items.push('b');
      });
      const base = Automerge.getHeads(doc);
      let other = Automerge.clone(doc, { actor: 'cccc0000cccc0000cccc0000cccc0000' });
      other = Automerge.change(other, (draft) => {
        draft.done = true;
      });
      const { newDoc } = Automerge.changeAt(doc, base, (draft) => {
        draft.items.unshift('z');
      });
      doc = Automerge.merge(newDoc, other);
      return { doc, other, saved: Automerge.save(doc), heads: Automerge.getHeads(doc) };
    });
    expect(Handle.tagOf(doc)).toBeDefined();
    expect(Automerge.getActorId(other)).toBe('cccc0000cccc0000cccc0000cccc0000');
    expect(Automerge.toJS(doc)).toEqual({ title: 'Notes', items: ['z', 'a', 'b'], done: true });
    expect(heads).toHaveLength(2);

    // Automerge loads the tab's bytes to the same document, history and heads.
    const loaded = A.load<Notes>(saved);
    expect(A.getHeads(loaded)).toEqual(heads);
    expect(canon(A.toJS(loaded))).toBe(canon(Automerge.toJS(doc)));
    expect(A.getHistory(loaded).map((state) => state.change.message)).toEqual(
      Automerge.getHistory(doc).map((state) => state.change.message),
    );
    const last = Automerge.getLastLocalChange(doc);
    expect(last).toBeDefined();
    if (last) {
      expect(A.getHeads(loaded)).toContain(A.decodeChange(last).hash);
    }

    // And a tab loads it back, as `repo.import` does with a saved document.
    const reloaded = withoutAutomerge(() => Automerge.load<Notes>(saved));
    expect(Handle.tagOf(reloaded)).toBeDefined();
    expect(Automerge.getHeads(reloaded)).toEqual(heads);
    expect(canon(Automerge.toJS(reloaded))).toBe(canon(Automerge.toJS(doc)));
  });

  test('with Automerge registered, the same calls make Automerge documents', () => {
    const doc = Automerge.from<Notes>({ title: 'Notes', items: [] });
    expect(Handle.tagOf(doc)).toBeUndefined();
    expect(A.isAutomerge(doc)).toBe(true);
  });
});
