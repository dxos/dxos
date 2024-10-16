//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/effect';

import { getProperty } from './ast';

describe('AST', () => {
  test('getProperty', () => {
    const TestSchema = S.Struct({
      name: S.String,
      address: S.Struct({
        zip: S.String,
      }),
    });

    {
      // TODO(burdon): Check type.
      const prop = getProperty(TestSchema, 'address.zip');
      expect(prop).to.exist;
    }
    {
      const prop = getProperty(TestSchema, 'address.city');
      expect(prop).not.to.exist;
    }
  });
});
