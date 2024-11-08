//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { type JsonProp, S, TypeEnum, FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import {
  formatToSchema,
  getPropertySchemaForFormat,
  getSchemaProperties,
  PropertySchema,
  type PropertyType,
} from './format';

describe('format', () => {
  test('invalid state', ({ expect }) => {
    const prop: Partial<PropertyType> = { property: 'test' as JsonProp };
    const schema = getPropertySchemaForFormat(prop.format);
    expect(schema).to.eq(formatToSchema[FormatEnum.None]);
    const validate = S.validate(PropertySchema);
    expect(() => validate(prop)).to.throw;
  });

  test('encode/decode format', async ({ expect }) => {
    const prop: PropertyType = {
      property: 'salary' as JsonProp,
      type: TypeEnum.Number,
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
      const newProp: PropertyType = { property: 'amount' as JsonProp, format: FormatEnum.Percent, ...props };
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
    const prop: Partial<PropertyType> = {
      property: 'org' as JsonProp,
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
    };

    // Invalid.
    {
      expect(() => validate(prop)).to.throw;
    }

    // Valid.
    {
      prop.referenceSchema = 'dxn:type:example.com/type/Test';
      expect(validate(prop)).to.deep.eq(prop);
    }
  });

  test.only('get props', ({ expect }) => {
    const prop: Partial<PropertyType> = {
      property: 'org' as JsonProp,
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
    };

    const schema = getPropertySchemaForFormat(prop.format);
    invariant(schema);

    const props = getSchemaProperties(schema);
    expect(props).to.have.length(7);
    console.log(JSON.stringify(props, null, 2));
  });
});
