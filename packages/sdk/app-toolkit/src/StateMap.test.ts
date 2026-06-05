//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import * as StateMap from './StateMap';

/** Per-item state stored in the side-map (the non-tag metadata for a feed item). */
const PostState = Schema.Struct({
  readAt: Schema.optional(Schema.String),
  imageUrl: Schema.optional(Schema.String),
});

/** A minimal immutable feed item. */
const Item = Schema.Struct({
  text: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.test.StateMapItem', '0.1.0')));

/** A host object carrying a per-object state side-map alongside (a notional feed of) items. */
const Host = Schema.Struct({
  postState: StateMap.field(PostState),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.StateMapHost', '0.1.0')));

describe('StateMap', () => {
  test('patches, reads, and removes per-object state', () => {
    const host = Obj.make(Host, {});
    const state = StateMap.bind(host, 'postState');

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
