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
  location: Format.GeoPoint,
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
      'number',
      'object',
      'number',
    ]);
  });

  test('discriminated unions', ({ expect }) => {
    const TestSpecSchema = S.Union(
      S.Struct({ kind: S.Literal('a'), label: S.String }),
      S.Struct({ kind: S.Literal('b'), count: S.Number, active: S.Boolean }),
    );

    type TestSpecType = S.Schema.Type<typeof TestSpecSchema>;

    {
      const obj: TestSpecType = {
        kind: 'a',
        label: 'test',
      };

      const props = getSchemaProperties(TestSpecSchema.ast, obj);
      expect(props.length).to.eq(2);
    }

    {
      const obj: TestSpecType = {
        kind: 'b',
        count: 100,
        active: true,
      };

      const props = getSchemaProperties(TestSpecSchema.ast, obj);
      expect(props.length).to.eq(3);
    }

    {
      const props = getSchemaProperties(TestSpecSchema.ast, {});
      expect(props.length).to.eq(1);
    }

    {
      const TestSchema = S.Struct({
        name: S.String,
        spec: S.optional(TestSpecSchema),
      });

      type TestType = S.Schema.Type<typeof TestSchema>;

      const obj: TestType = {
        name: 'DXOS',
      };

      const props = getSchemaProperties(TestSchema.ast, obj);
      expect(props.length).to.eq(2);

      {
        const props = getSchemaProperties(TestSpecSchema.ast, {});
        expect(props.length).to.eq(1);
      }
    }
  });
});
