//
// Copyright 2024 DXOS.org
//

import { create, echoObject } from '@dxos/echo-schema';
import { TestSchema } from '@dxos/echo-schema/testing';

import { Hypergraph } from '../hypergraph';
import { EchoTestBuilder, createDatabase } from '../testing';
import { reactiveProxyTests } from './proxy.blueprint-test';
import { EchoDatabase } from '../database';

describe('Echo reactive proxy', () => {
  reactiveProxyTests((schema) => {
    const builder = new EchoTestBuilder();
    let db: EchoDatabase;

    return {
      objectsHaveId: true,
      beforeAllCb: async () => {
        await builder.open();
        ({ db } = await builder.createDatabase());
      },
      afterAllCb: async () => {
        await builder.close();
      },
      createObjectFn: async (props = {}) => {
        const testSchema = schema === TestSchema ? schema.pipe(echoObject('TestSchema', '1.0.0')) : schema;
        const object = (schema == null ? create(props) : create(testSchema as any, props)) as TestSchema;
        if (testSchema && !db.graph.runtimeSchemaRegistry.isSchemaRegistered(testSchema)) {
          db.graph.runtimeSchemaRegistry.registerSchema(testSchema as any);
        }
        return db.add(object) as TestSchema;
      },
    };
  });
});
