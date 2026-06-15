//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { toJsonSchema } from '../JsonSchema';
import { Format } from './format';
import { TypeEnum, TypeFormat, getTypeEnum } from './types';

describe('formats', () => {
  test('annotations', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.String,
      email: Schema.optional(Format.Email),
      salary: Schema.optional(Format.Currency({ decimals: 2, code: 'usd' })),
      website: Schema.optional(Format.URL),
      birthday: Schema.optional(Format.Date),
      started: Schema.optional(Format.DateTime),
      active: Schema.optional(Schema.Boolean),
    });

    type TestType = Schema.Schema.Type<typeof TestSchema>;

    const jsonSchema = toJsonSchema(TestSchema);

    const data: TestType = {
      name: 'Alice',
      email: 'alice@example.com',
      birthday: '1999-06-11',
    };

    const validate = Schema.validateSync(TestSchema);
    validate(data);

    {
      const prop = jsonSchema.properties!['active' as const];
      expect(getTypeEnum(prop)).to.eq(TypeEnum.Boolean);
      expect(prop).includes({
        type: TypeEnum.Boolean,
      });
    }

    {
      const prop = jsonSchema.properties!['email' as const];
      expect(getTypeEnum(prop)).to.eq(TypeEnum.String);
      expect(prop).includes({
        type: TypeEnum.String,
        format: TypeFormat.Email,
        title: 'Email',
      });
    }

    {
      const prop = jsonSchema.properties!['salary' as const];
      expect(getTypeEnum(prop)).to.eq(TypeEnum.Number);
      expect(prop).includes({
        type: TypeEnum.Number,
        format: TypeFormat.Currency,
        title: 'Currency',
        multipleOf: 0.01,
        currency: 'USD',
      });
    }

    {
      const prop = jsonSchema.properties!['birthday' as const];
      expect(getTypeEnum(prop)).to.eq(TypeEnum.String);
      expect(prop).includes({
        type: TypeEnum.String,
        format: TypeFormat.Date,
      });
    }
  });
});

describe('GeoPoint', () => {
  const decode = Schema.decodeUnknownSync(Format.GeoPoint);

  test('rounds high-precision coordinates to 7 decimal places', ({ expect }) => {
    // Live geocoders (e.g. Nominatim/OSRM) emit > 7 decimals; rounding keeps them valid GeoPoints.
    expect(decode([-0.12776534, 51.50744561])).toEqual([-0.1277653, 51.5074456]);
  });

  test('passes through coordinates already within precision', ({ expect }) => {
    expect(decode([2.3522, 48.8566])).toEqual([2.3522, 48.8566]);
  });

  test('preserves an optional altitude', ({ expect }) => {
    expect(decode([-0.12776534, 51.50744561, 42])).toEqual([-0.1277653, 51.5074456, 42]);
  });

  test('clamps out-of-range coordinates', ({ expect }) => {
    expect(decode([200, 100])).toEqual([180, 90]);
  });
});
