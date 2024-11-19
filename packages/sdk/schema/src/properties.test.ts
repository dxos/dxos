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

  test('discriminated unions', ({ expect }) => {
    const TestSpecSchema = S.Union(
      S.Struct({ kind: S.Literal('a'), label: S.String }),
      S.Struct({ kind: S.Literal('b'), count: S.Number, active: S.Boolean }),
    );

    const TestSchema = S.Struct({
      name: S.String,
      spec: TestSpecSchema,
    });

    type TestType = S.Schema.Type<typeof TestSchema>;

    {
      const props = getSchemaProperties(TestSchema.ast);
      expect(props.length).to.eq(2);
    }

    {
      const obj: TestType = {
        name: 'DXOS',
        spec: {
          kind: 'a',
          label: 'test',
        },
      };

      const props = getSchemaProperties(TestSpecSchema.ast, obj['spec' as const]);
      expect(props.length).to.eq(2);
    }

    {
      const obj: TestType = {
        name: 'DXOS',
        spec: {
          kind: 'b',
          count: 100,
          active: true,
        },
      };

      const props = getSchemaProperties(TestSpecSchema.ast, obj['spec' as const]);
      expect(props.length).to.eq(3);
    }

    {
      const props = getSchemaProperties(TestSpecSchema.ast, {});
      expect(props.length).to.eq(1);
    }

    // TODO(burdon): Need to test from root.
  });
});
