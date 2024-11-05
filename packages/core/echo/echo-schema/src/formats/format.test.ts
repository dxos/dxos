//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S } from '@dxos/effect';

import { Format } from './format';
import { ScalarEnum, getScalarType } from './types';
import { toJsonSchema } from '../json';

// TODO(burdon): Are transformation viable with automerge?

describe('formats', () => {
  test('annotations', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.String,
      email: S.optional(Format.Email),
      salary: S.optional(Format.Currency({ code: 'usd', decimals: 2 })),
      website: S.optional(Format.URI),
      birthday: S.optional(Format.Date),
      started: S.optional(Format.DateTime),
      active: S.optional(S.Boolean),
    }).pipe(S.mutable);

    type TestType = S.Schema.Type<typeof TestSchema>;

    const jsonSchema = toJsonSchema(TestSchema);

    // TODO(burdon): Validate values (e.g., email, pattern).
    const data: TestType = {
      name: 'Alice',
      email: 'alice@example.com',
      birthday: { year: 1999, month: 6, day: 11 },
    };

    console.log(JSON.stringify({ jsonSchema, data }, null, 2));

    {
      const prop = jsonSchema.properties['active' as const];
      expect(getScalarType(prop)).to.eq(ScalarEnum.Boolean);
      expect(prop).includes({
        type: 'boolean',
      });
    }

    {
      const prop = jsonSchema.properties['email' as const];
      expect(getScalarType(prop)).to.eq(ScalarEnum.String);
      expect(prop).includes({
        type: 'string',
        format: 'email',
        title: 'Email',
      });
    }

    {
      const prop = jsonSchema.properties['salary' as const];
      expect(getScalarType(prop)).to.eq(ScalarEnum.Number);
      expect(prop).includes({
        type: 'number',
        format: 'currency',
        title: 'Currency',
        multipleOf: 0.01,
        currency: 'USD',
      });
    }

    {
      const prop = jsonSchema.properties['birthday' as const];
      expect(getScalarType(prop)).to.eq(ScalarEnum.String);
      expect(prop).includes({
        type: 'string',
        format: 'date',
      });
    }
  });
});
