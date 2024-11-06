//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S, ScalarEnum, FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { getPropertySchemaForFormat, PropertySchema, type Property, EmptySchema } from './format';

describe('format', () => {
  test('initial state', ({ expect }) => {
    const prop: Partial<Property> = {
      property: 'test',
    };

    const schema = getPropertySchemaForFormat(prop.format);
    expect(schema).to.eq(EmptySchema);

    expect(() => {
      S.validate(PropertySchema)(prop);
    }).to.throw;
  });

  test('encode/decode format', async ({ expect }) => {
    const prop: Property = {
      format: FormatEnum.Currency, // TODO(burdon): Can this be changed.
      type: ScalarEnum.Number,
      property: 'salary',
      title: 'Base salary',
      multipleOf: 0.01,
      currency: 'USD',
    };

    // Encode and decode.
    {
      const schema = getPropertySchemaForFormat(prop.format);
      invariant(schema);

      const decoded = S.decodeSync(schema)(prop);
      expect(decoded).to.include({
        multipleOf: 2,
      });

      const encoded = S.encodeSync(schema)(decoded);
      expect(encoded).to.deep.eq(prop);
    }

    // Changing format will change the schema.
    {
      const { format, ...props } = prop;
      expect(format).to.eq(FormatEnum.Currency);
      const newProp: Property = { format: FormatEnum.Percent, ...props };
      newProp.format = FormatEnum.Percent;

      const schema = getPropertySchemaForFormat(newProp.format);
      invariant(schema);

      const decoded = S.decodeSync(schema)(newProp);
      expect(Object.keys(newProp)).to.include('currency');
      expect(Object.keys(decoded)).not.to.include('currency');
    }
  });
});
