//
// Copyright 2024 DXOS.org
//

import { create, echoObject } from '@dxos/echo-schema';
import { TestSchema } from '@dxos/echo-schema/testing';

import { Hypergraph } from '../hypergraph';
import { createDatabase } from '../testing';
import { reactiveProxyTests } from './proxy.blueprint-test';

describe('Echo reactive proxy', () => {
  reactiveProxyTests((builder, schema) => {
    const testSetup = builder.createDatabase();
    return {
      objectsHaveId: true,
      createObjectFn: async (props = {}) => {
        const testSchema = schema === TestSchema ? schema.pipe(echoObject('TestSchema', '1.0.0')) : schema;
        const object = (schema == null ? create(props) : create(testSchema as any, props)) as TestSchema;
        const { db, graph } = await testSetup;
        if (testSchema && !graph.runtimeSchemaRegistry.isSchemaRegistered(testSchema)) {
          graph.runtimeSchemaRegistry.registerSchema(testSchema as any);
        }
        return db.add(object) as TestSchema;
      },
    };
  });
});
