//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/echo-schema';
import { type TestSchema } from '@dxos/echo-schema/testing';

import { reactiveProxyTests } from './proxy.blueprint-test';

describe('Reactive proxy', () => {
  reactiveProxyTests((schema) => {
    if (typeof schema === 'function') {
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
