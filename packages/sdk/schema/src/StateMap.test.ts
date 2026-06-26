//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, DXN, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type EntityId } from '@dxos/keys';

import * as StateMap from './StateMap';

/** Per-item state stored in the side-map (the non-tag metadata for a feed item). */
const PostState = Schema.Struct({
  readAt: Schema.optional(Schema.String),
  imageUrl: Schema.optional(Schema.String),
});
type PostState = Schema.Schema.Type<typeof PostState>;

/** A minimal immutable feed item. */
const Item = Type.makeObject(DXN.make('org.dxos.test.StateMapItem', '0.1.0'))(Schema.Struct({
  text: Schema.String,
}));

describe('StateMap', () => {
  test('patches, reads, and removes per-object state', () => {
    const stateMap = StateMap.make();
    const state = StateMap.bind<PostState>(stateMap);

    const itemA = Obj.make(Item, { text: 'a' });
    const itemB = Obj.make(Item, { text: 'b' });

    // Absent → empty object (no ?-chains at call sites).
    expect(state.get(itemA.id)).toEqual({});

    // Patch creates, then shallow-merges.
    state.patch(itemA.id, { readAt: 't1' });
    expect(state.get(itemA.id)).toEqual({ readAt: 't1' });
    state.patch(itemA.id, { imageUrl: 'u1' });
    expect(state.get(itemA.id)).toEqual({ readAt: 't1', imageUrl: 'u1' });
    // Overwrite a field.
    state.patch(itemA.id, { readAt: 't2' });
    expect(state.get(itemA.id)).toEqual({ readAt: 't2', imageUrl: 'u1' });

    state.patch(itemB.id, { imageUrl: 'u2' });

    // Predicate-filtered ids.
    expect(state.ids().sort()).toEqual([itemA.id, itemB.id].sort());
    expect(state.ids((value) => Boolean(value.readAt))).toEqual([itemA.id]);

    // Remove drops the entry.
    state.remove(itemA.id);
    expect(state.get(itemA.id)).toEqual({});
    expect(state.ids()).toEqual([itemB.id]);
  });
});

describe('StateMap (database integration)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Regression for DX-984 consistency: patch() for new entries must initialize via the ECHO proxy
  // (not plain-object spread) so each field assignment flows through the proxy, not a detached object.
  test('patch emits O(1) Automerge ops per entry (no per-entry overhead growth)', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [StateMap.StateMap] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const stateMap = yield* Database.add(StateMap.make());
      yield* Database.flush();

      const state = StateMap.bind(stateMap);
      const core = getObjectCore(stateMap);
      const N = 200;

      const opsBefore = A.stats(core.getDoc()).numOps;
      for (let i = 0; i < N; i++) {
        state.patch(`id-${i}` as EntityId, { readAt: `t${i}` });
      }
      const totalOps = A.stats(core.getDoc()).numOps - opsBefore;

      // Each new entry: makeMap + set field ≈ 2–3 ops, well under 10 per entry.
      expect(totalOps).toBeLessThan(N * 10);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });
});
