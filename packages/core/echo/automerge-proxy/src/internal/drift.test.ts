//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { seeded } from '../testing/index.ts';
import { decodeChange, saveNoCompress } from './automerge.ts';
import { Model } from './model.ts';
import { TabDoc } from './tab-doc.ts';

type Registers = { m: Record<string, number> };

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
      // What a tab holds: the model from the host's saved bytes, and a document built from the changes.
      const fromBytes = Model.fromSaved(saveNoCompress(merged));
      const fromChanges = TabDoc.fromChanges<Registers>(A.getAllChanges(merged).map(decodeChange), {});
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
    // Automerge 3.5.0 gets some keys wrong in its cached view; once an upgrade fixes that, this fails
    // and the risk comes out of the docs.
    expect(drifted).toBeGreaterThan(0);
    expect(checked).toBe(900);
  });
});
