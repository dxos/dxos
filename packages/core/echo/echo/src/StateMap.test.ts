//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Obj from './Obj';
import * as StateMap from './StateMap';
import * as Type from './Type';

/** Per-item state stored in the side-map (the non-tag metadata for a feed item). */
const PostState = Schema.Struct({
  readAt: Schema.optional(Schema.String),
  imageUrl: Schema.optional(Schema.String),
});

/** A host object carrying a per-object state side-map alongside (a notional feed of) items. */
const Host = Schema.Struct({
  postState: StateMap.field(PostState),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.StateMapHost', '0.1.0')));

describe('StateMap', () => {
  test('patches, reads, and removes per-object state', () => {
    const host = Obj.make(Host, {});
    const state = StateMap.bind(host, 'postState');

    const itemA = 'item-a';
    const itemB = 'item-b';

    // Absent → empty object (no ?-chains at call sites).
    expect(state.get(itemA)).toEqual({});

    // Patch creates, then shallow-merges.
    state.patch(itemA, { readAt: 't1' });
    expect(state.get(itemA)).toEqual({ readAt: 't1' });
    state.patch(itemA, { imageUrl: 'u1' });
    expect(state.get(itemA)).toEqual({ readAt: 't1', imageUrl: 'u1' });
    // Overwrite a field.
    state.patch(itemA, { readAt: 't2' });
    expect(state.get(itemA)).toEqual({ readAt: 't2', imageUrl: 'u1' });

    state.patch(itemB, { imageUrl: 'u2' });

    // Predicate-filtered ids.
    expect(state.ids().sort()).toEqual([itemA, itemB]);
    expect(state.ids((value) => Boolean(value.readAt))).toEqual([itemA]);

    // Remove drops the entry.
    state.remove(itemA);
    expect(state.get(itemA)).toEqual({});
    expect(state.ids()).toEqual([itemB]);
  });
});
