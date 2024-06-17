//
// Copyright 2024 DXOS.org
//

import { create, EchoObject } from '@dxos/echo-schema';
import { TestSchema } from '@dxos/echo-schema/testing';

import { reactiveProxyTests } from './proxy.blueprint-test';
import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from '../testing';

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
        const testSchema = schema === TestSchema ? schema.pipe(EchoObject('TestSchema', '1.0.0')) : schema;
        const object = (schema == null ? create(props) : create(testSchema as any, props)) as TestSchema;
        if (testSchema && !db.graph.schemaRegistry.hasSchema(testSchema)) {
          db.graph.schemaRegistry.addSchema([testSchema]);
        }
        return db.add(object) as TestSchema;
      },
    };
  });
});
