//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { FormatEnum, type JsonProp, TypeEnum } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

import { PropertySchema, type PropertyType, formatToSchema, getFormatSchema } from './format';
import { getSchemaProperties } from './properties';

describe('format', () => {
  test('get format schema', ({ expect }) => {
    for (const value of Object.values(FormatEnum)) {
      const node = getFormatSchema(value);
      expect(node, `Missing schema for: ${value}`).to.exist;
    }
  });

  test('invalid state', ({ expect }) => {
    const prop: Partial<PropertyType> = { property: 'test' as JsonProp };
    const schema = getFormatSchema(prop.format);
    expect(schema).to.eq(formatToSchema[FormatEnum.None]);
    const validate = Schema.validate(PropertySchema);
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
      const schema = getFormatSchema(prop.format);
      invariant(schema);

      const decoded = Schema.decodeSync(schema)(prop);
      expect(decoded).to.include({
        multipleOf: 2,
      });

      const encoded = Schema.encodeSync(schema)(decoded);
      expect(encoded).to.deep.eq(prop);
    }

    // Changing format will change the schema.
    {
      const { property: _, format, ...props } = prop;
      expect(format).to.eq(FormatEnum.Currency);
      const newProp: PropertyType = { property: 'amount' as JsonProp, format: FormatEnum.Percent, ...props };
      newProp.format = FormatEnum.Percent;

      const schema = getFormatSchema(newProp.format);
      invariant(schema);

      const decoded = Schema.decodeSync(schema)(newProp);
      expect(Object.keys(newProp)).to.include('currency');
      expect(Object.keys(decoded)).not.to.include('currency');
    }
  });

  test('ref format', async ({ expect }) => {
    const validate = Schema.validateSync(PropertySchema);
    const prop: Partial<PropertyType> = {
      property: 'organization' as JsonProp,
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

  test('get properties', ({ expect }) => {
    const prop: Partial<PropertyType> = {
      property: 'org' as JsonProp,
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
    };

    const schema = getFormatSchema(prop.format);
    invariant(schema);

    const props = getSchemaProperties(schema.ast);
    expect(props).to.have.length(7);
  });
});
