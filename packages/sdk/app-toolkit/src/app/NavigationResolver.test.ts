//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { URI } from '@dxos/keys';
import { Position } from '@dxos/util';

import * as NavigationResolver from './NavigationResolver';

const PAGES = [{ path: 'root/settings/test', label: 'Test settings', type: 'settings' }];

describe('NavigationResolver.forType', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] });
    const resolver = NavigationResolver.forType(TestSchema.Person, {
      getPath: ({ spaceId, objectId }) => `root/${spaceId}/people/${objectId}`,
      getLabel: (person) => person.name ?? '',
      position: Position.first,
      pages: PAGES,
    });
    const run = (query?: { uri?: URI.URI }) =>
      EffectEx.runPromise(resolver(query).pipe(Effect.provide(Database.layer(db))));
    return { db, run };
  };

  test('an instance of the type resolves to its section path', async ({ expect }) => {
    const { db, run } = await setup();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    await db.flush({ indexes: true });

    const targets = await run({ uri: Obj.getURI(person) });
    expect(targets).toEqual([
      {
        path: `root/${db.spaceId}/people/${person.id}`,
        label: 'alice',
        type: 'com.example.type.person',
        position: Position.first,
      },
    ]);
  });

  test('an object of another type resolves to nothing', async ({ expect }) => {
    const { db, run } = await setup();
    const task = db.add(Obj.make(TestSchema.Task, { title: 'ship' }));
    await db.flush({ indexes: true });

    expect(await run({ uri: Obj.getURI(task) })).toEqual([]);
  });

  test('a query-less call answers the pages listing', async ({ expect }) => {
    const { run } = await setup();
    expect(await run()).toEqual(PAGES);
    expect(await run({})).toEqual(PAGES);
  });

  test('an unparseable uri resolves to nothing', async ({ expect }) => {
    const { run } = await setup();
    expect(await run({ uri: URI.make('not-a-uri') })).toEqual([]);
  });
});
