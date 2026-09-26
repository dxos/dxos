//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { decodeChange } from './host.ts';
import { Model } from './model.ts';
import { TabDoc } from './tab.ts';
import { seeded } from './testing.ts';

type Registers = { m: Record<string, number> };

const saveNoCompress = (doc: A.Doc<unknown>): Uint8Array => {
  const meta: unknown = Reflect.get(doc, Symbol.for('_am_meta'));
  const handle: unknown = meta && Reflect.get(meta, 'handle');
  const save: unknown = handle && Reflect.get(handle, 'saveNoCompress');
  if (typeof save !== 'function') {
    throw new Error('No saveNoCompress');
  }
  return Reflect.apply(save, handle, []);
};

const keys = ['a', 'b', 'c'];

describe("Automerge's cached view after a merge", () => {
  test('can disagree with its own saved document; tab documents read the saved bytes and the changes, so they cannot', () => {
    const random = seeded(5);
    const { rand, pick } = random;
    const actor = () => Array.from({ length: 32 }, () => '0123456789abcdef'[pick(16)]).join('');
    let drifted = 0;
    let checked = 0;
    for (let round = 0; round < 300; round++) {
      const base = A.from<Registers>({ m: {} }, { actor: actor() });
      const peers = [0, 1, 2].map(() => A.clone(base, { actor: actor() }));
      for (let step = 0; step < 20; step++) {
        const index = pick(3);
        peers[index] = A.change(peers[index], (doc) => {
          const key = keys[pick(3)];
          if (rand() < 0.25) {
            delete doc.m[key];
          } else {
            doc.m[key] = pick(100);
          }
        });
        const other = pick(3);
        if (rand() < 0.3 && other !== index) {
          peers[other] = A.merge(peers[other], peers[index]);
        }
      }
      let merged = A.clone(peers[0]);
      for (const peer of peers.slice(1)) {
        merged = A.merge(merged, peer);
      }
      const fresh = A.load<Registers>(A.save(merged));
      const heads = A.getHeads(merged);
      // What a tab holds: the model from the worker's saved bytes, and a document built from the changes.
      const fromBytes = Model.fromSaved(saveNoCompress(merged));
      const fromChanges = TabDoc.fromChanges(A.getAllChanges(merged).map(decodeChange), {});
      const clock = fromBytes.clockOf(heads);
      const mapId = fromBytes.objectAt(['m'], clock);
      for (const key of keys) {
        checked++;
        const cached = [merged.m[key], A.getConflicts(merged.m, key)];
        const truth = [fresh.m[key], A.getConflicts(fresh.m, key)];
        if (JSON.stringify(cached) !== JSON.stringify(truth)) {
          drifted++;
        }
        const map: unknown = mapId ? fromBytes.materialize(mapId, clock) : undefined;
        const value = typeof map === 'object' && map !== null ? Reflect.get(map, key) : undefined;
        expect(JSON.stringify([value, mapId ? fromBytes.conflicts(mapId, key, clock) : undefined])).toBe(
          JSON.stringify(truth),
        );
        expect(JSON.stringify([fromChanges.doc().m[key], fromChanges.conflicts(fromChanges.heads(), ['m'], key)])).toBe(
          JSON.stringify(truth),
        );
      }
    }
    // The drift is rare but real: Automerge's own view got some keys wrong, and the tab documents none.
    expect(drifted).toBeGreaterThan(0);
    expect(checked).toBe(900);
  });
});
