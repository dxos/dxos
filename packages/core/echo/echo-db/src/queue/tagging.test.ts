//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Feed, Obj, Ref, Tag, TagIndex, Tagging, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';

/** A minimal immutable feed item. */
const Item = Schema.Struct({
  text: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.test.tagging.Item', '0.1.0')));

/** A host pairing an immutable feed of items with a tag index over them. */
const Host = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
  tags: TagIndex.field(),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.tagging.Host', '0.1.0')));

describe('Tagging', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('tags a mutable object via meta.tags', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag, TestSchema.Person] });
    const tag = db.add(Tag.make({ label: 'Urgent' }));
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    await db.flush();
    const tagId = Obj.getURI(tag);

    Tagging.set(person, tagId);
    expect(Tagging.get(person)).toEqual([tagId]);
    // Written through the object's own meta.
    expect([...(Obj.getMeta(person).tags ?? [])]).toEqual([tagId]);

    Tagging.unset(person, tagId);
    expect(Tagging.get(person)).toEqual([]);
  });

  test('tags an immutable feed object via the host TagIndex', async ({ expect }) => {
    const { db, queues } = await builder.createDatabase({ types: [Feed.Feed, Tag.Tag, Item, Host] });
    const feed = Feed.make();
    const host = db.add(Obj.make(Host, { feed: Ref.make(feed) }));
    Obj.setParent(feed, host);
    const tag = db.add(Tag.make({ label: 'Urgent' }));
    await db.flush();
    const tagId = Obj.getURI(tag);

    const queueDxn = Feed.getQueueUri(feed)!;
    const message = Obj.make(Item, { text: 'hello' });
    await queues.get(queueDxn).append([message]);

    Tagging.set(message, tagId, { host });
    expect(Tagging.get(message, { host })).toEqual([tagId]);
    // Written through the host index, not the (immutable) message's meta.
    expect([...TagIndex.bind(host, 'tags').objects(tagId)]).toEqual([message.id]);

    Tagging.unset(message, tagId, { host });
    expect(Tagging.get(message, { host })).toEqual([]);
  });

  test('resolves tag ids to Tag objects', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag] });
    const tag = db.add(Tag.make({ label: 'Urgent', hue: 'red' }));
    await db.flush();
    const tagId = Obj.getURI(tag);

    const [ref] = Tagging.resolve(db, [tagId]);
    expect(ref.target?.label).toBe('Urgent');
  });
});
