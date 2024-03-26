//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { test, describe } from '@dxos/test';

import { SchemaValidator, setSchemaProperties } from './schema-validator';

describe('reactive', () => {
  test('throws on ambiguous discriminated type union', () => {
    const schema = S.struct({
      union: S.union(S.struct({ a: S.number }), S.struct({ b: S.string })),
    });
    expect(() => SchemaValidator.validateSchema(schema)).to.throw();
  });

  test('handles any-schema correctly', () => {
    const schema = S.struct({ field: S.any });
    expect(() => setSchemaProperties({ field: { nested: {} } }, schema)).not.to.throw();
  });
});
