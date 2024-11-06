//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S, ScalarEnum, FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { getPropertySchemaForFormat, PropertySchema, type Property, EmptySchema } from './format';

describe('format', () => {
  test('invalid state', ({ expect }) => {
    const prop: Partial<Property> = {
      property: 'test',
    };

    const schema = getPropertySchemaForFormat(prop.format);
    expect(schema).to.eq(EmptySchema);

    // TODO(burdon): Validation options (e.g., exact).
    expect(() => {
      S.validate(PropertySchema)(prop);
    }).to.throw;
  });

  test('encode/decode format', async ({ expect }) => {
    const prop: Property = {
      property: 'salary',
      type: ScalarEnum.Number,
      format: FormatEnum.Currency,
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
      const { property: _, format, ...props } = prop;
      expect(format).to.eq(FormatEnum.Currency);
      const newProp: Property = { property: 'amount', format: FormatEnum.Percent, ...props };
      newProp.format = FormatEnum.Percent;

      const schema = getPropertySchemaForFormat(newProp.format);
      invariant(schema);

      const decoded = S.decodeSync(schema)(newProp);
      expect(Object.keys(newProp)).to.include('currency');
      expect(Object.keys(decoded)).not.to.include('currency');
    }
  });

  test('ref format', async ({ expect }) => {
    const validate = S.validateSync(PropertySchema);
    const prop: Partial<Property> = {
      property: 'org',
      type: ScalarEnum.Ref,
      format: FormatEnum.Ref,
    };

    // Invalid.
    {
      expect(() => validate(prop)).to.throw;
    }

    // Valid.
    {
      prop.refSchema = 'example.com/type/Test';
      expect(validate(prop)).to.deep.eq(prop);
    }
  });
});
