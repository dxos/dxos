//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import {
  MemoryTabHost,
  type Shape,
  type Tab,
  TabNetwork,
  canon,
  initialShape,
  randomEdit,
  seeded,
} from '../testing/index.ts';
import { decodeChange, saveNoCompress } from './automerge.ts';
import { hashesByActor } from './changes.ts';
import { CheckIndex } from './check-index.ts';
import { encodeChange } from './encode.ts';
import { type DecodedOp } from './ids.ts';
import { Model } from './model.ts';

const OWNER = 'aaaa0000aaaa0000aaaa0000aaaa0000';
const PEER = 'cccc0000cccc0000cccc0000cccc0000';
const TAB = 'bbbb0000bbbb0000bbbb0000bbbb0000';

const hashesOf = (doc: A.Doc<unknown>): string[] => A.getAllChanges(doc).map((change) => A.decodeChange(change).hash);

const snapshotHashes = (doc: A.Doc<unknown>): Uint8Array => hashesByActor(A.getChangesMetaSince(doc, []));

/** Every op id in a document, with its op. */
const opsOf = (doc: A.Doc<unknown>): { id: string; op: DecodedOp }[] =>
  A.getAllChanges(doc).flatMap((bytes) => {
    const change = decodeChange(bytes);
    return change.ops.map((op, index) => ({ id: `${change.startOp + index}@${change.actor}`, op }));
  });

type Start = {
  map: Record<string, number | string>;
  list: (number | { n: number })[];
  text: string;
  nested: { items: string[] };
};

/** A document with maps, lists, text, nested objects, overwritten values, deleted elements and a conflict. */
const startingDoc = (): A.Doc<Start> => {
  let doc = A.from<Start>(
    { map: { a: 1, b: 'x' }, list: [1, 2, { n: 1 }], text: 'hello', nested: { items: ['p', 'q'] } },
    { actor: OWNER },
  );
  doc = A.change(doc, (draft) => {
    draft.map.a = 2;
    draft.list.splice(1, 1);
    A.splice(draft, ['text'], 1, 2, 'EY');
  });
  let peer = A.clone(doc, { actor: PEER });
  peer = A.change(peer, (draft) => {
    draft.map.a = 3;
    draft.nested.items.push('r');
  });
  doc = A.change(doc, (draft) => {
    draft.map.a = 4;
  });
  return A.merge(doc, peer);
};

describe('the worker check index', () => {
  test('accepts every change tabs write', () => {
    for (const seed of [61, 62, 63]) {
      const random = seeded(seed);
      const { pick } = random;
      const host = new MemoryTabHost();
      host.create('doc', initialShape());
      const network = new TabNetwork(host);
      const tabs: Tab<Shape>[] = [network.open<Shape>('doc'), network.open<Shape>('doc')];
      const refused: string[] = [];
      tabs.forEach((tab) => tab.tab.onRejected((changes) => refused.push(...changes.map((change) => change.hash))));
      for (let step = 0; step < 150; step++) {
        const tab = tabs[pick(tabs.length)];
        if (random.rand() < 0.1 && tab.tab.heads().length > 0) {
          // An older version: the tab's own history before its last change.
          const history = tab.tab.model.changeHashes();
          tab.tab.changeAt(history.slice(0, Math.max(1, history.length - 2)).slice(-1), randomEdit(random));
        } else {
          tab.tab.change(randomEdit(random));
        }
        network.deliver(pick(network.pending + 1));
      }
      network.settle();
      expect(refused).toEqual([]);
      const expected = canon(A.toJS(host.doc('doc')));
      tabs.forEach((tab) => expect(canon(tab.tab.doc())).toBe(expected));
      // A tab opening now takes its hashes from the index's table, each at its change's saved place.
      const late = network.open<Shape>('doc');
      expect(late.tab.model.changeHashes()).toEqual(hashesOf(host.doc('doc')));
      expect(canon(late.tab.doc())).toBe(expected);
    }
  });

  test('every change it accepts, Automerge applies and the tab model reads the same, and it refuses the rest', () => {
    const reasons = new Map<string, number>();
    let accepted = 0;
    for (const seed of [71, 72, 73, 74]) {
      const { rand, pick } = seeded(seed);
      let doc = startingDoc();
      const index = CheckIndex.fromSaved(saveNoCompress(doc), snapshotHashes(doc));
      const model = Model.fromSaved(saveNoCompress(doc));
      const versions: A.Heads[] = [A.getHeads(doc)];
      let seq = 1;
      for (let step = 0; step < 400; step++) {
        const all = opsOf(doc);
        const ids = all.map(({ id }) => id);
        const objects = ['_root', ...all.filter(({ op }) => op.action.startsWith('make')).map(({ id }) => id)];
        const maxOp = Math.max(0, ...ids.map((id) => Number(id.split('@')[0])));
        const someId = () => (rand() < 0.1 ? `${maxOp + 5}@${OWNER}` : ids[pick(ids.length)]);
        // On an older version a tab writes under a fresh actor, as Automerge's changeAt does.
        const older = rand() < 0.2;
        const deps = older ? versions[pick(versions.length)] : A.getHeads(doc);
        const actor = older ? Array.from({ length: 32 }, () => '0123456789abcdef'[pick(16)]).join('') : TAB;
        const startOp = maxOp + 1;
        const clock = model.clockOf(deps);
        const keys = ['a', 'b', 'items', 'n', 'map', 'list', 'text', 'new'];
        const values = [7, 'z', 'two', null, true];
        const withValue = (action: string, value: unknown) =>
          action === 'set'
            ? { value, ...(typeof value === 'number' ? { datatype: 'int' } : {}) }
            : action === 'inc'
              ? { value: 1 }
              : {};
        /** An op as a correct tab writes it: the current values as preds, a visible element as the target. */
        const plausible = (): DecodedOp | undefined => {
          const obj = objects[pick(objects.length)];
          if (!model.hasObject(obj, clock)) {
            return undefined;
          }
          const action = ['set', 'set', 'del', 'makeMap', 'makeText'][pick(5)];
          if (model.typeOf(obj) === 'map') {
            const key = keys[pick(keys.length)];
            const current = model.currentValueIds(obj, key, clock);
            return { action, obj, key, ...withValue(action, values[pick(values.length)]), pred: current };
          }
          const elems = model.visibleElements(obj, clock);
          if (elems.length === 0 || action !== 'del' || rand() < 0.3) {
            const insertAction = action === 'del' ? 'set' : action;
            const after = elems.length > 0 && rand() < 0.8 ? elems[pick(elems.length)].key : '_head';
            const value = model.typeOf(obj) === 'text' ? 'q' : values[pick(values.length)];
            return {
              action: insertAction,
              obj,
              elemId: after,
              insert: true,
              ...withValue(insertAction, value),
              pred: [],
            };
          }
          const elem = elems[pick(elems.length)];
          return { action, obj, elemId: elem.key, pred: model.elementValueIds(elem, clock) };
        };
        const ops: DecodedOp[] = [];
        for (let count = 1 + pick(3); count > 0; count--) {
          const op = rand() < 0.5 ? plausible() : undefined;
          if (op) {
            ops.push(op);
            continue;
          }
          // References mostly within the right object, to reach deep into the checks.
          const obj = rand() < 0.9 ? objects[pick(objects.length)] : someId();
          const inObj = all.filter(({ op: each }) => each.obj === obj);
          const sameObjId = () => (inObj.length > 0 && rand() < 0.8 ? inObj[pick(inObj.length)].id : someId());
          const action = ['set', 'set', 'set', 'del', 'makeMap', 'makeList', 'makeText', 'inc'][pick(8)];
          const map = obj === '_root' || all.some(({ id, op: each }) => id === obj && each.action === 'makeMap');
          const pred = Array.from({ length: pick(3) }, sameObjId);
          const insert = !map && rand() < 0.5;
          const target =
            rand() < (map ? 0.9 : 0.1)
              ? { key: keys[pick(keys.length)] }
              : { elemId: rand() < 0.15 ? '_head' : sameObjId() };
          ops.push({
            action,
            obj,
            ...target,
            ...(insert ? { insert: true } : {}),
            ...withValue(action, values[pick(values.length)]),
            pred: insert && rand() < 0.8 ? [] : pred,
          });
        }
        const encoded = encodeChange({ actor, seq: older ? 1 : seq, startOp, time: 0, message: null, deps, ops });
        const change = decodeChange(encoded.bytes);
        const reason = index.accept(change, index.clockOf(change.deps));
        if (reason !== undefined) {
          const kind = reason.replace(/[0-9]+@[0-9a-f]+/g, 'ID').replace(/ [0-9]+/g, ' N');
          reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
          continue;
        }
        accepted++;
        seq += older ? 0 : 1;
        // Automerge applies exactly these bytes, saves and loads them, and exports the change under its hash.
        [doc] = A.applyChanges(doc, [encoded.bytes]);
        const reloaded = A.load(A.save(doc));
        expect(A.getHeads(reloaded)).toEqual(A.getHeads(doc));
        expect(hashesOf(reloaded)).toContain(encoded.hash);
        model.applyChange(change);
        const heads = A.getHeads(doc);
        expect(canon(model.materialize('_root', model.clockOf(heads)))).toBe(canon(A.toJS(doc)));
        versions.push(heads);
      }
    }
    expect(accepted).toBeGreaterThan(400);
    // Refusals of every kind the checks make.
    const kinds = [...reasons.keys()].join('\n');
    for (const kind of [
      'a tab writes no counters',
      'unknown object',
      'is not a value in',
      'a delete names no pred',
      'map op without a key',
      'sequence op without an element',
      'unknown element',
      'insert with a pred',
      'an update names the head',
      'is not a value of',
    ]) {
      expect(kinds).toContain(kind);
    }
  });

  test('a refused change leaves the index as it was', () => {
    const doc = startingDoc();
    const index = CheckIndex.fromSaved(saveNoCompress(doc), snapshotHashes(doc));
    const heads = A.getHeads(doc);
    const all = opsOf(doc);
    const maxOp = Math.max(...all.map(({ id }) => Number(id.split('@')[0])));
    const map = all.find(({ op }) => op.action === 'makeMap' && op.key === 'map')?.id ?? '';
    const write = (seq: number, startOp: number, ops: DecodedOp[]) =>
      decodeChange(encodeChange({ actor: TAB, seq, startOp, time: 0, message: null, deps: heads, ops }).bytes);

    // The first op would pass; the second names an object that does not exist.
    const bad = write(1, maxOp + 1, [
      { action: 'makeList', obj: map, key: 'child', pred: [] },
      { action: 'set', obj: `${maxOp + 9}@${TAB}`, key: 'x', value: 1, datatype: 'int', pred: [] },
    ]);
    expect(index.accept(bad, index.clockOf(heads))).toMatch(/unknown object/);
    expect(index.hasChange(bad.hash)).toBe(false);
    // The same ids again, now a map: had the refused list stayed, the key write into it would fail.
    const good = write(1, maxOp + 1, [
      { action: 'makeMap', obj: map, key: 'child', pred: [] },
      { action: 'set', obj: `${maxOp + 1}@${TAB}`, key: 'x', value: 1, datatype: 'int', pred: [] },
    ]);
    expect(index.accept(good, index.clockOf(heads))).toBeUndefined();
    expect(index.hasChange(good.hash)).toBe(true);
  });

  test("a change must follow its actor's previous change, as a tab's change on an older version under a fresh actor does", () => {
    const doc = A.from<{ items: string[] }>({ items: [] }, { actor: OWNER });
    const before = A.getHeads(doc);
    const index = CheckIndex.fromSaved(saveNoCompress(doc), snapshotHashes(doc));
    const list = opsOf(doc).find(({ op }) => op.action === 'makeList')?.id ?? '';
    const insert = (actor: string, seq: number, startOp: number) =>
      decodeChange(
        encodeChange({
          actor,
          seq,
          startOp,
          time: 0,
          message: null,
          deps: before,
          ops: [{ action: 'set', obj: list, elemId: '_head', insert: true, value: 'a', pred: [] }],
        }).bytes,
      );
    expect(index.accept(insert(TAB, 1, 2), index.clockOf(before))).toBeUndefined();
    // Automerge would apply this, then fail to load the document it saves.
    expect(index.accept(insert(TAB, 2, 3), index.clockOf(before))).toMatch(/does not follow/);
    expect(index.accept(insert(PEER, 1, 3), index.clockOf(before))).toBeUndefined();
  });
});
