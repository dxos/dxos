//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S } from '@dxos/effect';

import { Format } from './formats';
import { toJsonSchema } from '../json';

describe('formats', () => {
  test('annotations', ({ expect }) => {
    const jsonSchema = toJsonSchema(
      S.Struct({
        name: S.String,
        email: Format.Email,
        salary: Format.Currency({ code: 'usd', decimals: 2 }),
        website: Format.URI,
        birthday: S.Date,
      }),
    );

    const getProp = (prop: string) => jsonSchema.properties[prop];

    expect(getProp('email')).includes({
      type: 'string',
      format: 'email',
      title: 'Email',
    });

    expect(getProp('salary')).includes({
      type: 'number',
      format: 'currency',
      title: 'Currency',
      multipleOf: 0.01,
      currency: 'USD',
    });

    // TODO(burdon): Validate values (e.g., according to pattern).
  });
});
