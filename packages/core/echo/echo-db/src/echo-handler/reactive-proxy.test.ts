//
// Copyright 2024 DXOS.org
//

import { describe } from 'vitest';

import { EchoObject, getTypeAnnotation } from '@dxos/echo-schema';
import { Testing } from '@dxos/echo-schema/testing';
import { live } from '@dxos/live-object';

import { reactiveProxyTests } from './reactive-proxy.blueprint-test';
import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from '../testing';

// NOTE: These are tests for @dxos/echo-schema but they live here currently because the tests are shared.
//  echo-schema cannot export the test sequence because @dxos/test is not published.
describe('Reactive proxy', () => {
  reactiveProxyTests((schema) => {
    if (schema != null && getTypeAnnotation(schema) != null) {
      return null;
    }

    return {
      objectsHaveId: false,
      createObjectFn: async (props = {}) => {
        return (schema == null ? live(props) : live(schema, props)) as Testing.TestSchema;
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
      allowObjectAssignments: false,
      beforeAllCb: async () => {
        await builder.open();
        ({ db } = await builder.createDatabase());
      },
      afterAllCb: async () => {
        await builder.close();
      },
      createObjectFn: async (props = {}) => {
        const testSchema =
          schema === Testing.TestSchema
            ? schema.pipe(
                EchoObject({
                  typename: 'example.com/test/TestSchema',
                  version: '0.1.0',
                }),
              )
            : schema;
        const object = (schema == null ? live(props) : live(testSchema as any, props)) as Testing.TestSchema;
        if (testSchema && !db.graph.schemaRegistry.hasSchema(testSchema)) {
          db.graph.schemaRegistry.addSchema([testSchema]);
        }

        return db.add(object as any) as Testing.TestSchema;
      },
    };
  });
});
