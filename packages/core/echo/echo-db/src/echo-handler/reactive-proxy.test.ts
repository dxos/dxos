//
// Copyright 2024 DXOS.org
//

import { describe } from 'vitest';

import { EchoObject, getObjectAnnotation } from '@dxos/echo-schema';
import { TestSchema } from '@dxos/echo-schema/testing';
import { create } from '@dxos/live-object';

import { reactiveProxyTests } from './reactive-proxy.blueprint-test';
import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from '../testing';

// NOTE: These are tests for @dxos/echo-schema but they live here currently because the tests are shared.
//  echo-schema cannot export the test blueprint because @dxos/test is not published.
describe('Reactive proxy', () => {
  reactiveProxyTests((schema) => {
    if (schema != null && getObjectAnnotation(schema) != null) {
      return null;
    }

    return {
      objectsHaveId: false,
      createObjectFn: async (props = {}) => {
        return (schema == null ? create(props) : create(schema as any, props)) as TestSchema;
      },
    };
  });
});

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
        const testSchema =
          schema === TestSchema ? schema.pipe(EchoObject('example.com/test/TestSchema', '0.1.0')) : schema;
        const object = (schema == null ? create(props) : create(testSchema as any, props)) as TestSchema;
        if (testSchema && !db.graph.schemaRegistry.hasSchema(testSchema)) {
          db.graph.schemaRegistry.addSchema([testSchema]);
        }

        return db.add(object) as TestSchema;
      },
    };
  });
});
