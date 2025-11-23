//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Format } from '@dxos/echo';
import { TypeEnum } from '@dxos/echo/internal';
import { type JsonProp } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { PropertySchema, type PropertyType, formatToSchema, getFormatSchema } from './format';
import { getSchemaProperties } from './properties';

describe('format', () => {
  test('get format schema', ({ expect }) => {
    for (const value of [
      Format.TypeFormat.None,
      Format.TypeFormat.String,
      Format.TypeFormat.Number,
      Format.TypeFormat.Boolean,
      Format.TypeFormat.Ref,
      Format.TypeFormat.DID,
      Format.TypeFormat.DXN,
      Format.TypeFormat.Email,
      Format.TypeFormat.Formula,
      Format.TypeFormat.Hostname,
      Format.TypeFormat.JSON,
      Format.TypeFormat.Markdown,
      Format.TypeFormat.Regex,
      Format.TypeFormat.SingleSelect,
      Format.TypeFormat.MultiSelect,
      Format.TypeFormat.URL,
      Format.TypeFormat.UUID,
      Format.TypeFormat.Currency,
      Format.TypeFormat.Integer,
      Format.TypeFormat.Percent,
      Format.TypeFormat.Timestamp,
      Format.TypeFormat.DateTime,
      Format.TypeFormat.Date,
      Format.TypeFormat.Time,
      Format.TypeFormat.Duration,
      Format.TypeFormat.GeoPoint,
    ]) {
      const node = getFormatSchema(value);
      expect(node, `Missing schema for: ${value}`).to.exist;
    }
  });

  test('invalid state', ({ expect }) => {
    const prop: Partial<PropertyType> = { property: 'test' as JsonProp };
    const schema = getFormatSchema(prop.format);
    expect(schema).to.eq(formatToSchema[Format.TypeFormat.None]);
    const validate = Schema.validate(PropertySchema);
    expect(() => validate(prop)).to.throw;
  });

  test('encode/decode format', async ({ expect }) => {
    const prop: PropertyType = {
      property: 'salary' as JsonProp,
      type: TypeEnum.Number,
      format: Format.TypeFormat.Currency,
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
      expect(format).to.eq(Format.TypeFormat.Currency);
      const newProp: PropertyType = { property: 'amount' as JsonProp, format: Format.TypeFormat.Percent, ...props };
      newProp.format = Format.TypeFormat.Percent;

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
      format: Format.TypeFormat.Ref,
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
      format: Format.TypeFormat.Ref,
    };

    const schema = getFormatSchema(prop.format);
    invariant(schema);

    const props = getSchemaProperties(schema.ast);
    expect(props).to.have.length(7);
  });
});
