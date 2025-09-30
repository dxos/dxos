import { Obj, Type } from '@dxos/echo';
//
// Copyright 2024 DXOS.org
//

import { describe } from 'vitest';

import { getTypeAnnotation } from '@dxos/echo/internal';
import { TestingDeprecated } from '@dxos/echo/testing';

import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from '../testing';

import { reactiveProxyTests } from './reactive-proxy.blueprint-test';

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
        return (
          schema == null ? Obj.make(Type.Expando, props) : Obj.make(schema, props)
        ) as TestingDeprecated.TestSchema;
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
          schema === TestingDeprecated.TestSchema
            ? schema.pipe(
                Type.Obj({
                  typename: 'example.com/test/TestSchema',
                  version: '0.1.0',
                }),
              )
            : schema;
        const object = (
          schema == null ? Obj.make(Type.Expando, props) : Obj.make(testSchema as any, props)
        ) as TestingDeprecated.TestSchema;
        if (testSchema && !db.graph.schemaRegistry.hasSchema(testSchema)) {
          db.graph.schemaRegistry.addSchema([testSchema]);
        }

        return db.add(object as any) as TestingDeprecated.TestSchema;
      },
    };
  });
});
