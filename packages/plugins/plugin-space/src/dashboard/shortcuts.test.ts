//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Annotation, DXN, Filter, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { FAVORITE_TAG, findFavoriteTag, toShortcuts } from './shortcuts';

class TestItem extends Type.makeObject<TestItem>(DXN.make('org.dxos.type.test.streamDeckItem', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'cyan' }),
  ),
) {}

describe('favorites', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('queries the favorite tag and projects the objects onto slots', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestItem, Tag.Tag] });
    const tag = await Tag.findOrCreate(db, { label: FAVORITE_TAG });
    const tagRef = Ref.make(tag);

    db.add(Obj.make(TestItem, { name: 'Zebra', [Obj.Meta]: { tags: [tagRef] } }));
    db.add(Obj.make(TestItem, { name: 'Apple', [Obj.Meta]: { tags: [tagRef] } }));
    db.add(Obj.make(TestItem, { name: 'Not a favorite' }));
    await db.flush({ indexes: true });

    const found = findFavoriteTag(await db.query(Filter.type(Tag.Tag)).run());
    expect(found).toBeDefined();

    const objects = await db.query(Query.select(Filter.tag(Obj.getURI(found!)))).run();
    const specs = toShortcuts(objects, 4);

    // Sorted by label, padded to the slot count.
    expect(specs.map((spec) => spec?.label)).toEqual(['Apple', 'Zebra', undefined, undefined]);
    expect(specs[0]).toMatchObject({ icon: 'ph--note--regular', hue: 'cyan' });
    // The key carries a navigation path, which is what opening the object consumes.
    expect(specs[0]?.target).toBe(
      GraphPath.getObjectPathFromObject(objects.find((object) => object.name === 'Apple')!),
    );
  });

  test('ignores a keyed provider tag with the same label', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestItem, Tag.Tag] });
    await Tag.findOrCreate(db, { label: FAVORITE_TAG, key: { source: 'example.com', id: 'starred' } });
    await db.flush({ indexes: true });

    expect(findFavoriteTag(await db.query(Filter.type(Tag.Tag)).run())).toBeUndefined();
  });

  test('truncates to the available slots', ({ expect }) => {
    expect(toShortcuts([], 8)).toHaveLength(8);
  });
});
