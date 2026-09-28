//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, onTestFinished, test } from 'vitest';

import { Database, Obj, Type } from '@dxos/echo';
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

/** Records the trace events emitted for the given objects, ignoring writes the database makes on its own. */
const recordEvents = () => {
  const recorded: Recorded[] = [];
  const processor = { emit: (name: string, attributes: EventAttributes) => recorded.push({ name, attributes }) };
  TRACE_PROCESSOR.remoteEvents.registerProcessor(processor);
  onTestFinished(() => TRACE_PROCESSOR.remoteEvents.unregisterProcessor(processor));
  return (...objects: Obj.Unknown[]) =>
    recorded.filter(({ attributes }) => objects.some(({ id }) => id === attributes.objectId));
};

describe('object trace events', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('an add reports the object once, with whether its type is user-facing', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person, Internal] });
    const eventsFor = recordEvents();

    const person = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    const internal = db.add(Obj.make(Internal, { name: 'cache' }));

    expect(eventsFor(person, internal)).toEqual([
      {
        name: 'echo.object.add',
        attributes: {
          spaceId: db.spaceId,
          objectId: person.id,
          typename: Obj.getTypename(person),
          userType: true,
          external: false,
        },
      },
      {
        name: 'echo.object.add',
        attributes: {
          spaceId: db.spaceId,
          objectId: internal.id,
          typename: Obj.getTypename(internal),
          userType: false,
          external: false,
        },
      },
    ]);
  });

  test('an object with foreign keys is marked external', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const eventsFor = recordEvents();

    const synced = db.add(
      Obj.make(TestSchema.Person, { [Obj.Meta]: { keys: [{ source: 'example.com', id: '42' }] }, name: 'Ada' }),
    );

    expect(eventsFor(synced).map(({ attributes }) => attributes.external)).toEqual([true]);
  });

  test('an add with track: false reports nothing', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const eventsFor = recordEvents();

    const seeded = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }), { track: false });

    expect(eventsFor(seeded)).toEqual([]);
  });

  test('Database.add reports by default and is silenced by Database.Track', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const eventsFor = recordEvents();
    const add = (name: string) => Database.add(Obj.make(TestSchema.Person, { name }));

    const [created, seeded] = await EffectEx.runPromise(
      Effect.all([add('Ada'), add('Grace').pipe(Effect.provideService(Database.Track, false))]).pipe(
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(eventsFor(created).map(({ name }) => name)).toEqual(['echo.object.add']);
    expect(eventsFor(seeded)).toEqual([]);
  });

  test('restoring a removed object reports the removal but no second add', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    const eventsFor = recordEvents();

    db.remove(person);
    db.add(person);

    expect(eventsFor(person)).toEqual([
      { name: 'echo.object.remove', attributes: { spaceId: db.spaceId, objectId: person.id } },
    ]);
  });
});
