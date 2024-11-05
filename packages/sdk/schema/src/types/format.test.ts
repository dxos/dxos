//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { ScalarEnum, FormatEnum } from '@dxos/echo-schema';

import { getPropertySchema, type Property } from './format';

describe('format', () => {
  test('get fields for format', async ({ expect }) => {
    const prop: Property = {
      format: FormatEnum.Currency,
      type: ScalarEnum.Number,
      property: 'salary',
      title: 'Base salary',
    };

    // TODO(burdon): Encode/decode validate.
    const schema = getPropertySchema(prop.format);
    console.log(JSON.stringify(schema?.ast.toJSON(), null, 2));
  });
});
