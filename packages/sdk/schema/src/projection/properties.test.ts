//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { assert, describe, test } from 'vitest';

import { Format } from '@dxos/echo/internal';
import { isArrayType } from '@dxos/effect';

import { getSchemaProperties } from './properties';

const TestSchema = Schema.Struct({
  name: Schema.String,
  active: Schema.Boolean,
  email: Format.Email,
  age: Schema.Number,
  location: Format.GeoPoint,
  address: Schema.Struct({
    city: Schema.String,
    zip: Schema.String,
  }),
  scores: Schema.optional(Schema.Array(Schema.Number)),
});

describe('properties', () => {
  test('get props', ({ expect }) => {
    const props = getSchemaProperties(TestSchema.ast);
    expect(props.map((prop) => prop.ast._tag)).to.deep.eq([
      'StringKeyword',
      'BooleanKeyword',
      'StringKeyword',
      'NumberKeyword',
      'TupleType',
      'TypeLiteral',
      'TupleType',
    ]);
  });

  test('arrays', ({ expect }) => {
    const props = getSchemaProperties(TestSchema.ast);
    const arrayProp = props.find((prop) => isArrayType(prop.ast));

    expect(arrayProp).to.not.eq(undefined);
    assert(arrayProp?.ast._tag === 'TupleType');
    expect(arrayProp?.ast.rest[0].type._tag).to.eq('NumberKeyword');
    expect(arrayProp?.name).to.eq('scores');
  });

  test('discriminated unions', ({ expect }) => {
    const TestSpecSchema = Schema.Union(
      Schema.Struct({ kind: Schema.Literal('a'), label: Schema.String }),
      Schema.Struct({ kind: Schema.Literal('b'), count: Schema.Number, active: Schema.Boolean }),
    );

    type TestSpecType = Schema.Schema.Type<typeof TestSpecSchema>;

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
      const TestSchema = Schema.Struct({
        name: Schema.String,
        spec: Schema.optional(TestSpecSchema),
      });

      type TestType = Schema.Schema.Type<typeof TestSchema>;
      const obj: TestType = {
        name: 'DXOS',
      };

      {
        const props = getSchemaProperties(TestSchema.ast, obj);
        expect(props.length).to.eq(2);
      }
      {
        const props = getSchemaProperties(TestSpecSchema.ast, {});
        expect(props.length).to.eq(1);
      }
    }
  });

  test('literal unions', ({ expect }) => {
    const ColorSchema = Schema.Struct({
      color: Schema.Union(Schema.Literal('red'), Schema.Literal('green'), Schema.Literal('blue')),
    });

    const props = getSchemaProperties(ColorSchema.ast);
    expect(props[0]).to.deep.include({
      name: 'color',
      options: ['red', 'green', 'blue'],
    });
  });
});
