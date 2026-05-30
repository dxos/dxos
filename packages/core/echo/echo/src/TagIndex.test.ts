//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Obj from './Obj';
import * as TagIndex from './TagIndex';
import * as Type from './Type';

/** A minimal item standing in for an immutable feed object. */
const Item = Schema.Struct({
  text: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.test.TagIndexItem', '0.1.0')));

/** A host object carrying a tag index alongside (a notional feed of) items. */
const Host = Schema.Struct({
  tags: TagIndex.field(),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.TagIndexHost', '0.1.0')));

describe('TagIndex', () => {
  test('sets, unsets, and inverts feed-object tags', () => {
    const host = Obj.make(Host, {});
    const tags = TagIndex.bind(host, 'tags');

    const a = Obj.make(Item, { text: 'a' });
    const b = Obj.make(Item, { text: 'b' });
    const urgent = 'dxn:tag:urgent';
    const later = 'dxn:tag:later';

    tags.setTag(urgent, a.id);
    tags.setTag(urgent, b.id);
    tags.setTag(later, b.id);
    // Idempotent.
    tags.setTag(urgent, a.id);

    // Filter the feed by tag: tag -> object ids.
    expect([...tags.objects(urgent)]).toEqual([a.id, b.id]);
    expect([...tags.objects(later)]).toEqual([b.id]);
    expect([...tags.objects('dxn:tag:missing')]).toEqual([]);

    // Inverse: object -> tag ids.
    expect(tags.tags(b.id).sort()).toEqual([later, urgent]);
    expect(tags.tags(a.id)).toEqual([urgent]);
    expect(tags.tagIds().sort()).toEqual([later, urgent]);

    // Unset prunes the membership; emptying a tag drops the key.
    tags.unsetTag(urgent, a.id);
    expect([...tags.objects(urgent)]).toEqual([b.id]);
    tags.unsetTag(urgent, b.id);
    expect([...tags.objects(urgent)]).toEqual([]);
    expect(tags.tagIds()).toEqual([later]);
  });
});
