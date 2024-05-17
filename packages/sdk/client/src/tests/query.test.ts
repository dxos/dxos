//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { S, TypedObject, create, type ReactiveObject } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { Filter, type Query } from '../echo';
import { TestBuilder } from '../testing';

describe('Query', () => {
  test('query returns objects with both dynamic and static types', async () => {
    // create an object with a static type
    // persist the static type to the schemaRegistry
    // create a second object with the type returned from the schemaRegistry
    // query for the typename
    // check that we got both objects

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
    const obj1 = space.db.add(create(GeneratedSchema, { title: 'test' }));

    await checkQueryResult(space.db.query(Filter.schema(GeneratedSchema)), [obj1]);

    const schema = space.db.schemaRegistry.add(GeneratedSchema);
    const obj2 = space.db.add(create(schema, { title: 'test' }));

    await checkQueryResult(space.db.query(Filter.schema(schema)), [obj1, obj2]);
    await checkQueryResult(space.db.query(Filter.schema(GeneratedSchema)), [obj1, obj2]);
  });
});

const checkQueryResult = async (query: Query, expected: ReactiveObject<any>[]) => {
  const queriedTrigger = new Trigger();
  const unsub = query.subscribe(
    ({ objects }) => {
      if (objects.length === expected.length && objects.every((object) => expected.includes(object as any))) {
        queriedTrigger.wake();
      }
    },
    { fire: true },
  );

  await queriedTrigger.wait({ timeout: 1_000 });
  unsub();
};
