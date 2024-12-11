//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S } from '@dxos/effect';

import { Format } from './format';
import { FormatEnum, TypeEnum, getTypeEnum } from './types';
import { toJsonSchema } from '../json';

describe('formats', () => {
  test('annotations', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.String,
      email: S.optional(Format.Email),
      salary: S.optional(Format.Currency({ decimals: 2, code: 'usd' })),
      website: S.optional(Format.URL),
      birthday: S.optional(Format.Date),
      started: S.optional(Format.DateTime),
      active: S.optional(S.Boolean),
      location: S.optional(Format.GeoPosition),
    }).pipe(S.mutable);

    type TestType = S.Schema.Type<typeof TestSchema>;

    const jsonSchema = toJsonSchema(TestSchema);

    const data: TestType = {
      name: 'Alice',
      email: 'alice@example.com',
      birthday: '1999-06-11',
      location: [-122.4194, 37.7749],
    };

    const validate = S.validateSync(TestSchema);
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
        format: FormatEnum.Email,
        title: 'Email',
      });
    }

    {
      const prop = jsonSchema.properties!['salary' as const];
      expect(getTypeEnum(prop)).to.eq(TypeEnum.Number);
      expect(prop).includes({
        type: TypeEnum.Number,
        format: FormatEnum.Currency,
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
        format: FormatEnum.Date,
      });
    }

    {
      const prop = jsonSchema.properties!['location' as const];
      expect(getTypeEnum(prop)).to.eq(TypeEnum.Array);
      expect(prop).includes({
        type: TypeEnum.Array,
        format: FormatEnum.GeoPosition,
      });
    }
  });
});
