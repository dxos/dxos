//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Event as AsyncEvent } from '@dxos/async';
import { DXN, Error as EchoError, Event, Feed, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

class Viewed extends Type.makeEvent<Viewed>(DXN.make('com.example.type.viewed', '0.1.0'))(
  Schema.Struct({
    by: Schema.String,
  }),
) {}

class Commented extends Type.makeEvent<Commented>(DXN.make('com.example.type.commented', '0.1.0'))(
  Schema.Struct({
    text: Schema.String,
    author: Ref.Ref(TestSchema.Person).pipe(Schema.optional),
  }),
) {}

const TYPES = [Feed.Feed, TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy, Viewed, Commented];

// Both host executors answer event queries, so every case runs against each.
describe.each(['sql', 'memory'] as const)('object events (%s executor)', (queryExecutor) => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('append and query events of one object', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));

    Obj.appendEvents(person, [Event.make(Viewed, { by: 'bob' }), Event.make(Viewed, { by: 'carol' })]);
    await db.flush({ indexes: true });

    const events = await db.query(Query.events(person, Viewed)).run();
    expect(events.map((event) => event.by)).toEqual(['bob', 'carol']);
    for (const event of events) {
      expect(Event.isEvent(event)).toBe(true);
      expect(Obj.isObject(event)).toBe(false);
      expect(Event.getObjectURI(event)).toBeDefined();
      expect(Event.getTimestamp(event)).toBeTypeOf('number');
    }
  });

  test('filter events by type', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));

    Obj.appendEvents(person, [
      Event.make(Viewed, { by: 'bob' }),
      Event.make(Commented, { text: 'hello' }),
      Event.make(Viewed, { by: 'carol' }),
    ]);
    await db.flush({ indexes: true });

    expect(await db.query(Query.events(person, Viewed)).run()).toHaveLength(2);
    const [comment] = await db.query(Query.events(person, Commented)).run();
    expect(comment.text).toEqual('hello');
    expect(await db.query(Query.events(person)).run()).toHaveLength(3);
  });

  test('traversal from a selection of objects', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'bob' }));
    const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));

    Obj.appendEvents(alice, [Event.make(Viewed, { by: 'x' })]);
    Obj.appendEvents(bob, [Event.make(Viewed, { by: 'y' }), Event.make(Viewed, { by: 'z' })]);
    Obj.appendEvents(org, [Event.make(Viewed, { by: 'org-viewer' })]);
    await db.flush({ indexes: true });

    const personEvents = await db.query(Query.type(TestSchema.Person).events(Viewed)).run();
    expect(personEvents.map((event) => event.by).sort()).toEqual(['x', 'y', 'z']);

    const aliceEvents = await db.query(Query.select(Filter.id(alice.id)).events()).run();
    expect(aliceEvents).toHaveLength(1);

    // Filters apply to the events, not to their owners.
    const filtered = await db.query(Query.type(TestSchema.Person).events(Viewed).select({ by: 'y' })).run();
    expect(filtered.map((event) => event.by)).toEqual(['y']);
  });

  test('events of one object are absent from another', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'bob' }));

    Obj.appendEvents(alice, [Event.make(Viewed, { by: 'x' })]);
    await db.flush({ indexes: true });

    expect(await db.query(Query.events(bob)).run()).toHaveLength(0);
    expect(await db.query(Query.events(alice)).run()).toHaveLength(1);
  });

  test('events never show up in object queries', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const feed = db.add(Feed.make({ name: 'items' }));
    await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'feed-item' })]);

    Obj.appendEvents(alice, [Event.make(Viewed, { by: 'x' })]);
    await db.flush({ indexes: true });

    const everything = await db.query(Filter.everything()).run();
    expect(everything.some((entity) => Event.isEvent(entity))).toBe(false);

    const withFeeds = await db.query(Query.select(Filter.everything()).from(db, { includeFeeds: true })).run();
    expect(withFeeds.some((entity) => Event.isEvent(entity))).toBe(false);
    expect(withFeeds.some((entity) => Obj.isObject(entity) && (entity as TestSchema.Person).name === 'feed-item')).toBe(
      true,
    );

    const children = await db.query(Query.select(Filter.id(alice.id)).children()).run();
    expect(children).toHaveLength(0);

    const feedItems = await db.query(Query.select(Filter.everything()).from(feed)).run();
    expect(feedItems).toHaveLength(1);
  });

  test('an object in a feed has events too', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'items' }));
    const item = Obj.make(TestSchema.Person, { name: 'feed-item' });
    await db.appendToFeed(feed, [item]);

    Obj.appendEvents(item, [Event.make(Viewed, { by: 'bob' })]);
    await db.flush({ indexes: true });

    const events = await db.query(Query.events(item, Viewed)).run();
    expect(events.map((event) => event.by)).toEqual(['bob']);
    expect(await db.query(Query.select(Filter.everything()).from(feed)).run()).toHaveLength(1);
  });

  test('events can hold refs to objects', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const doc = db.add(Obj.make(TestSchema.Person, { name: 'doc' }));
    const author = db.add(Obj.make(TestSchema.Person, { name: 'author' }));

    Obj.appendEvents(doc, [Event.make(Commented, { text: 'nice', author: Ref.make(author) })]);
    await db.flush({ indexes: true });

    const [comment] = await db.query(Query.events(doc, Commented)).run();
    expect((await comment.author?.load())?.name).toEqual('author');
  });

  test('pending events are visible before flush', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));

    const query = db.query(Query.events(person, Viewed));
    const updated = new AsyncEvent();
    const unsubscribe = query.subscribe(() => updated.emit());
    try {
      const waitForEvent = updated.waitFor(() => query.results.length === 1);
      Obj.appendEvents(person, [Event.make(Viewed, { by: 'bob' })]);
      await waitForEvent;
      expect(query.results[0].by).toEqual('bob');
    } finally {
      unsubscribe();
    }
  });

  test('events persist across a reload', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    let personId: string;
    {
      await using db = await peer.createDatabase();
      const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
      Obj.appendEvents(person, [Event.make(Viewed, { by: 'bob' })]);
      await db.flush({ indexes: true });
      personId = person.id;
    }

    await peer.reload();

    await using db = await peer.openLastDatabase();
    const [reloaded] = await db.query(Query.type(TestSchema.Person)).run();
    expect(reloaded.id).toEqual(personId);
    const events = await db.query(Query.events(reloaded, Viewed)).run();
    expect(events.map((event) => event.by)).toEqual(['bob']);
  });

  test('appendEvents validates its inputs', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    const feed = db.add(Feed.make({ name: 'items' }));
    const relation = db.add(
      Relation.make(TestSchema.EmployedBy, { [Relation.Source]: alice, [Relation.Target]: org, role: 'CTO' }),
    );

    expect(() => Obj.appendEvents(feed, [Event.make(Viewed, { by: 'x' })])).toThrow(EchoError.EventsNotSupportedError);
    expect(() =>
      Obj.appendEvents(Obj.make(TestSchema.Person, { name: 'detached' }), [Event.make(Viewed, { by: 'x' })]),
    ).toThrow(EchoError.EventsNotSupportedError);
    // @ts-expect-error Relations have no event feed.
    expect(() => Obj.appendEvents(relation, [Event.make(Viewed, { by: 'x' })])).toThrow(
      EchoError.EventsNotSupportedError,
    );

    const event = Event.make(Viewed, { by: 'x' });
    Obj.appendEvents(alice, [event]);
    expect(() => Obj.appendEvents(alice, [event])).toThrow(EchoError.EventNotSupportedError);
    expect(() => Obj.appendEvents(org, [event])).toThrow(EchoError.EventNotSupportedError);

    db.remove(org);
    expect(() => Obj.appendEvents(org, [Event.make(Viewed, { by: 'x' })])).toThrow(EchoError.EventsNotSupportedError);

    expect(() => db.add(Event.make(Viewed, { by: 'x' }))).toThrow(EchoError.EventNotSupportedError);
    await expect(db.appendToFeed(feed, [Event.make(Viewed, { by: 'x' })])).rejects.toThrow(
      EchoError.EventNotSupportedError,
    );
  });

  test('events of a deleted object are hidden unless deleted objects are included', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES, queryExecutor });
    const db = await peer.createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    Obj.appendEvents(person, [Event.make(Viewed, { by: 'bob' })]);
    await db.flush({ indexes: true });

    db.remove(person);
    await db.flush({ indexes: true });

    expect(await db.query(Query.type(TestSchema.Person).events(Viewed)).run()).toHaveLength(0);
    expect(
      await db.query(Query.type(TestSchema.Person).events(Viewed).options({ deleted: 'include' })).run(),
    ).toHaveLength(1);
  });
});
