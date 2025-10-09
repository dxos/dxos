import { Obj } from '@dxos/echo';
//
// Copyright 2024 DXOS.org
//

import { describe } from 'vitest';

import { TestingDeprecated } from '@dxos/echo/testing';

import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from '../testing';

import { reactiveProxyTests } from './reactive-proxy.blueprint-test';

// NOTE: These are tests for @dxos/echo/internal but they live here currently because the tests are shared.
//  echo-schema cannot export the test sequence because @dxos/test is not published.
describe('Reactive proxy', () => {
  reactiveProxyTests((schema) => {
    return {
      objectsHaveId: true,
      createObjectFn: async (props = {}) => {
        return Obj.make(schema, props) as any;
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
        const object = Obj.make(schema as any, props) as TestingDeprecated.TestSchema;
        if (schema && !db.graph.schemaRegistry.hasSchema(schema)) {
          db.graph.schemaRegistry.addSchema([schema]);
        }

        return db.add(object as any) as TestingDeprecated.TestSchema;
      },
    };
  });
});
