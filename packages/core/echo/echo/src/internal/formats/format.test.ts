//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { toJsonSchema } from '../json-schema';

import { Format } from './format';
import { FormatEnum, TypeEnum, getTypeEnum } from './types';

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
    }).pipe(Schema.mutable);

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
  });
});
