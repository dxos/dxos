//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S, ScalarEnum, FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { getPropertySchemaForFormat, type Property } from './format';

describe('format', () => {
  test('get fields for format', async ({ expect }) => {
    const prop: Property = {
      format: FormatEnum.Currency,
      type: ScalarEnum.Number,
      property: 'salary',
      title: 'Base salary',
      multipleOf: 0.01,
    };

    const schema = getPropertySchemaForFormat(prop.format);
    invariant(schema);

    const decoded = S.decodeSync(schema)(prop);
    expect(decoded).to.include({
      multipleOf: 2,
    });

    const encoded = S.encodeSync(schema)(decoded);
    expect(encoded).to.deep.eq(prop);

    // TODO(burdon): Encode/decode validate.
  });
});
