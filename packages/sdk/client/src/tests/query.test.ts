//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { S, TypedObject, create, type ReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { Filter, type Query } from '../echo';
import { TestBuilder } from '../testing';

describe('Query', () => {
  test('query returns objects with both dynamic and static types', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    class GeneratedSchema extends TypedObject({ typename: 'dxos.tests.staticAndDynamic', version: '0.1.0' })({
      title: S.string,
    }) {}

    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    if (!client.experimental.graph.runtimeSchemaRegistry.isSchemaRegistered(GeneratedSchema)) {
      client.experimental.graph.runtimeSchemaRegistry.registerSchema(GeneratedSchema);
    }

    await client.halo.createIdentity();

    const space = await client.spaces.create();
    // create an object with a static type
    const obj1 = space.db.add(create(GeneratedSchema, { title: 'test' }));

    await checkQueryResult(space.db.query(Filter.schema(GeneratedSchema)), [obj1]);

    // persist the static type to the schemaRegistry
    const schema = space.db.schemaRegistry.add(GeneratedSchema);

    // create a second object with the type returned from the schemaRegistry
    const obj2 = space.db.add(create(schema, { title: 'test' }));

    // query for the objects with the static type
    await checkQueryResult(space.db.query(Filter.schema(GeneratedSchema)), [obj1, obj2]);
    // query for the objects with the persisted type
    await checkQueryResult(space.db.query(Filter.schema(schema)), [obj1, obj2]);
  });
});

const checkQueryResult = async (query: Query, expected: ReactiveObject<any>[]) => {
  const queriedTrigger = new Trigger();
  const unsub = query.subscribe(
    ({ objects }) => {
      log.info('query', {
        objects: objects.map((obj) => JSON.stringify(obj)),
        expected: expected.map((obj) => JSON.stringify(obj)),
      });
      if (objects.length === expected.length && objects.every((object) => expected.includes(object as any))) {
        queriedTrigger.wake();
      }
    },
    { fire: true },
  );

  await queriedTrigger.wait({ timeout: 1_000 });
  unsub();
};
