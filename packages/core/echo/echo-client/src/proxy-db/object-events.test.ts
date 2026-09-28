//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, onTestFinished, test } from 'vitest';

import { Database, Feed, Obj, Relation, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { type EventAttributes, TRACE_PROCESSOR } from '@dxos/tracing';

import { EchoTestBuilder } from '../testing/index.ts';

/** A type without the user-type annotation: internal, so its objects are not user activity. */
class Internal extends Type.makeObject<Internal>(DXN.make('com.example.type.internal', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

type Recorded = { name: string; attributes: EventAttributes };

/** Records ECHO's trace events; `about` narrows them to the given entities, ignoring the database's own writes. */
const recordEvents = () => {
  const recorded: Recorded[] = [];
  const processor = { emit: (name: string, attributes: EventAttributes) => recorded.push({ name, attributes }) };
  TRACE_PROCESSOR.remoteEvents.registerProcessor(processor);
  onTestFinished(() => TRACE_PROCESSOR.remoteEvents.unregisterProcessor(processor));
  return {
    all: () => recorded,
    about: (...entities: { id: string }[]) =>
      recorded.filter(({ attributes }) => entities.some(({ id }) => id === attributes.objectId)),
  };
};

describe('ECHO trace events', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('an add reports the object once, attributed to the user', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person, Internal] });
    const events = recordEvents();

    const person = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    const internal = db.add(Obj.make(Internal, { name: 'cache' }));

    expect(events.about(person, internal)).toEqual([
      {
        name: 'echo.object.add',
        attributes: {
          spaceId: db.spaceId,
          objectId: person.id,
          typename: Obj.getTypename(person),
          relation: false,
          userType: true,
          origin: 'user',
        },
      },
      {
        name: 'echo.object.add',
        attributes: {
          spaceId: db.spaceId,
          objectId: internal.id,
          typename: Obj.getTypename(internal),
          relation: false,
          userType: false,
          origin: 'user',
        },
      },
    ]);
  });

  test('an object with foreign keys is attributed to an integration unless the caller says otherwise', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const events = recordEvents();
    const synced = () =>
      Obj.make(TestSchema.Person, { [Obj.Meta]: { keys: [{ source: 'example.com', id: '42' }] }, name: 'Ada' });

    const imported = db.add(synced());
    const typed = db.add(synced(), { origin: 'user' });

    expect(events.about(imported, typed).map(({ attributes }) => attributes.origin)).toEqual(['integration', 'user']);
  });

  test('the Effect API attributes writes to the provided Database.Origin', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const events = recordEvents();

    const person = await EffectEx.runPromise(
      Effect.gen(function* () {
        const person = yield* Database.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
        yield* Database.remove(person);
        return person;
      }).pipe(Effect.provideService(Database.Origin, 'agent'), Effect.provide(Database.layer(db))),
    );

    expect(events.about(person).map(({ name, attributes }) => [name, attributes.origin])).toEqual([
      ['echo.object.add', 'agent'],
      ['echo.object.remove', 'agent'],
    ]);
  });

  test('a relation is reported as one', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy],
    });
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    const events = recordEvents();

    const employment = db.add(
      Relation.make(TestSchema.EmployedBy, { [Relation.Source]: person, [Relation.Target]: org, role: 'CEO' }),
    );

    expect(events.about(employment).map(({ name, attributes }) => [name, attributes.relation])).toEqual([
      ['echo.object.add', true],
    ]);
  });

  test('restoring a removed object reports the removal but no second add', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    const events = recordEvents();

    db.remove(person, { origin: 'system' });
    db.add(person);

    expect(events.about(person)).toEqual([
      {
        name: 'echo.object.remove',
        attributes: {
          spaceId: db.spaceId,
          objectId: person.id,
          typename: Obj.getTypename(person),
          relation: false,
          userType: true,
          origin: 'system',
        },
      },
    ]);
  });

  test('persisting a type reports it once', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const events = recordEvents();
    const Task = Type.makeObject(DXN.make('com.example.type.task', '0.1.0'))(Schema.Struct({ title: Schema.String }));

    await db.addType(Task);
    await db.addType(Task);

    expect(events.all().filter(({ name }) => name === 'echo.type.add')).toEqual([
      {
        name: 'echo.type.add',
        attributes: { spaceId: db.spaceId, typename: 'com.example.type.task', version: '0.1.0', origin: 'user' },
      },
    ]);
  });

  test('a feed append reports each item with its feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));
    const events = recordEvents();

    const ada = Obj.make(TestSchema.Person, { name: 'Ada' });
    const grace = Obj.make(TestSchema.Person, { name: 'Grace' });
    await db.appendToFeed(feed, [ada], { origin: 'agent' });
    db.add(grace, { to: feed });

    expect(
      events.about(ada, grace).map(({ name, attributes }) => [name, attributes.feedId, attributes.origin]),
    ).toEqual([
      ['echo.feed.append', feed.id, 'agent'],
      ['echo.feed.append', feed.id, 'user'],
    ]);
  });
});
