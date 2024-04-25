//
// Copyright 2024 DXOS.org
//

import { create } from './create';
import { reactiveProxyTests } from '../proxy/proxy.blueprint-test';
import { type TestSchema } from '../testing';

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
