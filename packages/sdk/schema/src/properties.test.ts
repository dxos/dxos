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
});

describe('properties', () => {
  test('get props', ({ expect }) => {
    const props = getSchemaProperties(TestSchema.ast);
    expect(props.map((p) => p.type)).to.deep.eq(['string', 'boolean', 'string', 'number', 'object']);
  });
});
