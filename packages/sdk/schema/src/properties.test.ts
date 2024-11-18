//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Format, S } from '@dxos/echo-schema';

import { getSchemaProperties } from './properties';

const TestSchema = S.Struct({
  name: S.String,
  active: S.Boolean,
  email: Format.Email,
  age: S.Number,
  location: Format.LatLng,
  address: S.Struct({
    city: S.String,
    zip: S.String,
  }),
  scores: S.optional(S.Array(S.Number)),
});

describe('properties', () => {
  test('get props', ({ expect }) => {
    const props = getSchemaProperties(TestSchema.ast);
    expect(props.map((prop) => prop.type)).to.deep.eq([
      //
      'string',
      'boolean',
      'string',
      'number',
      'object',
      'object',
      'number',
    ]);
  });
});
