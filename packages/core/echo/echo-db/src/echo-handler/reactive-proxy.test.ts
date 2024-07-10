//
// Copyright 2024 DXOS.org
//

import { create, getEchoObjectAnnotation } from '@dxos/echo-schema';
import { type TestSchema } from '@dxos/echo-schema/testing';

import { reactiveProxyTests } from './proxy.blueprint-test';

// NOTE: These are tests for @dxos/echo-schema but they live here currently because the tests are shared.
//  echo-schema cannot export the test blueprint because @dxos/test is not published.
describe('Reactive proxy', () => {
  reactiveProxyTests((schema) => {
    if (schema != null && getEchoObjectAnnotation(schema) != null) {
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
