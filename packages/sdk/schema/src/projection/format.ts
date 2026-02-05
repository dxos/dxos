//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';
import { DecimalPrecision, JsonProp, type JsonSchemaType, SelectOption, TypeEnum } from '@dxos/echo/internal';

/**
 * Base schema.
 */
export const BaseProperty = Schema.Struct({
  property: JsonProp.annotations({
    title: 'Property',
    description: 'Property name',
  }),

  // TODO(wittjosiah): Rename label?
  title: Schema.optional(
    Schema.String.annotations({
      title: 'Label',
      description: 'Property label',
    }),
  ),

  description: Schema.optional(
    Schema.String.annotations({
      title: 'Description',
      description: 'Property description',
    }),
  ),
});

export type BaseProperty = Schema.Schema.Type<typeof BaseProperty>;

const extend = <Fields extends Schema.Struct.Fields>(format: Format.TypeFormat, type: TypeEnum, fields?: Fields) =>
  Schema.extend(
    BaseProperty,
    Schema.Struct({
      type: Schema.Literal(type),
      format: Schema.Literal(format).annotations({
        title: 'Type format',
      }),
      ...fields,
    }),
  ).pipe(Schema.mutable);

interface FormatSchemaCommon extends BaseProperty {
  type: TypeEnum;
  format: Format.TypeFormat;
  multipleOf?: number;
  currency?: string;
  referenceSchema?: string;
  referencePath?: string;
  options?: SelectOption[];
}

/**
 * Map of schema definitions.
 */
// TODO(burdon): Translations?
export const formatToSchema: Record<Format.TypeFormat, Schema.Schema<FormatSchemaCommon>> = {
  [Format.TypeFormat.None]: Schema.extend(
    BaseProperty,
    Schema.Struct({
      type: Schema.Enums(TypeEnum),
      format: Schema.Literal(Format.TypeFormat.None) as Schema.Schema<Format.TypeFormat>,
    }),
  ).pipe(Schema.mutable),

  //
  // Scalars
  //

  [Format.TypeFormat.String]: extend(Format.TypeFormat.String, TypeEnum.String),
  [Format.TypeFormat.Number]: extend(Format.TypeFormat.Number, TypeEnum.Number),
  [Format.TypeFormat.Boolean]: extend(Format.TypeFormat.Boolean, TypeEnum.Boolean),
  [Format.TypeFormat.Ref]: extend(Format.TypeFormat.Ref, TypeEnum.Ref, {
    referenceSchema: Schema.NonEmptyString.annotations({
      title: 'Record type',
      description: 'Name of the record type',
    }),
    referencePath: Schema.optional(
      JsonProp.annotations({
        title: 'Lookup property',
        description: 'Referenced property',
      }),
    ),
  }),

  //
  // Strings
  //

  [Format.TypeFormat.DID]: extend(Format.TypeFormat.DID, TypeEnum.String),
  [Format.TypeFormat.DXN]: extend(Format.TypeFormat.DXN, TypeEnum.String),
  [Format.TypeFormat.Email]: extend(Format.TypeFormat.Email, TypeEnum.String),
  [Format.TypeFormat.Formula]: extend(Format.TypeFormat.Formula, TypeEnum.String),
  [Format.TypeFormat.Hostname]: extend(Format.TypeFormat.Hostname, TypeEnum.String),
  [Format.TypeFormat.JSON]: extend(Format.TypeFormat.JSON, TypeEnum.String),
  [Format.TypeFormat.Markdown]: extend(Format.TypeFormat.Markdown, TypeEnum.String),
  [Format.TypeFormat.Regex]: extend(Format.TypeFormat.Regex, TypeEnum.String),
  [Format.TypeFormat.Text]: extend(Format.TypeFormat.Text, TypeEnum.String),
  [Format.TypeFormat.URL]: extend(Format.TypeFormat.URL, TypeEnum.String),
  [Format.TypeFormat.UUID]: extend(Format.TypeFormat.UUID, TypeEnum.String),

  //
  // Select
  //

  [Format.TypeFormat.SingleSelect]: extend(Format.TypeFormat.SingleSelect, TypeEnum.String, {
    options: Schema.Array(SelectOption).annotations({
      title: 'Options',
      description: 'Available choices',
    }),
  }),

  [Format.TypeFormat.MultiSelect]: extend(Format.TypeFormat.MultiSelect, TypeEnum.Object, {
    options: Schema.Array(SelectOption).annotations({
      title: 'Options',
      description: 'Available choices',
    }),
  }),

  //
  // Numbers
  //

  [Format.TypeFormat.Currency]: extend(Format.TypeFormat.Currency, TypeEnum.Number, {
    multipleOf: Schema.optional(DecimalPrecision),
    currency: Schema.optional(
      Schema.String.annotations({
        title: 'Currency code',
        description: 'ISO 4217 currency code.',
      }),
    ),
  }),
  [Format.TypeFormat.Integer]: extend(Format.TypeFormat.Integer, TypeEnum.Number),
  [Format.TypeFormat.Percent]: extend(Format.TypeFormat.Percent, TypeEnum.Number, {
    multipleOf: Schema.optional(DecimalPrecision),
  }),
  [Format.TypeFormat.Timestamp]: extend(Format.TypeFormat.Timestamp, TypeEnum.Number),

  //
  // Dates
  //

  [Format.TypeFormat.DateTime]: extend(Format.TypeFormat.DateTime, TypeEnum.String),
  [Format.TypeFormat.Date]: extend(Format.TypeFormat.Date, TypeEnum.String),
  [Format.TypeFormat.Time]: extend(Format.TypeFormat.Time, TypeEnum.String),
  [Format.TypeFormat.Duration]: extend(Format.TypeFormat.Duration, TypeEnum.String),

  //
  // Objects
  //

  // TODO(wittjosiah): Doesn't align with getSimpleType where Tuples are treated as objects.
  [Format.TypeFormat.GeoPoint]: extend(Format.TypeFormat.GeoPoint, TypeEnum.Array, {
    // TODO(wittjosiah): If this is an array or tuple then it shows up in the form.
    items: Schema.Any,
    minItems: Schema.Literal(2),
    additionalItems: Schema.Literal(false),
  }),
};

/**
 * Discriminated union of schema based on format.
 * This is the schema used by the ViewEditor's Form.
 * It is mapped to/from the View's Field AND Schema properties via the ViewProjection.
 */
export const PropertySchema = Schema.Union(
  formatToSchema[Format.TypeFormat.None],
  formatToSchema[Format.TypeFormat.String],
  formatToSchema[Format.TypeFormat.Number],
  formatToSchema[Format.TypeFormat.Boolean],
  formatToSchema[Format.TypeFormat.Ref],

  //
  // Strings
  //

  formatToSchema[Format.TypeFormat.DID],
  formatToSchema[Format.TypeFormat.DXN],
  formatToSchema[Format.TypeFormat.Email],
  formatToSchema[Format.TypeFormat.Formula],
  formatToSchema[Format.TypeFormat.Hostname],
  formatToSchema[Format.TypeFormat.JSON],
  formatToSchema[Format.TypeFormat.Markdown],
  formatToSchema[Format.TypeFormat.Regex],
  formatToSchema[Format.TypeFormat.URL],
  formatToSchema[Format.TypeFormat.UUID],
  formatToSchema[Format.TypeFormat.SingleSelect],
  formatToSchema[Format.TypeFormat.MultiSelect],

  //
  // Numbers
  //

  formatToSchema[Format.TypeFormat.Currency],
  formatToSchema[Format.TypeFormat.Integer],
  formatToSchema[Format.TypeFormat.Percent],
  formatToSchema[Format.TypeFormat.Timestamp],

  //
  // Dates
  //

  formatToSchema[Format.TypeFormat.DateTime],
  formatToSchema[Format.TypeFormat.Date],
  formatToSchema[Format.TypeFormat.Time],
  formatToSchema[Format.TypeFormat.Duration],

  //
  // Objects
  //

  formatToSchema[Format.TypeFormat.GeoPoint],
);

export interface PropertyType extends Schema.Simplify<Schema.Schema.Type<typeof PropertySchema>> {}

export const formatToAdditionalPropertyAttributes: Record<Format.TypeFormat, Partial<JsonSchemaType>> = {
  [Format.TypeFormat.None]: {},
  [Format.TypeFormat.String]: {},
  [Format.TypeFormat.Number]: {},
  [Format.TypeFormat.Boolean]: {},
  [Format.TypeFormat.Ref]: {},
  [Format.TypeFormat.DID]: {},
  [Format.TypeFormat.DXN]: {},
  [Format.TypeFormat.Email]: {},
  [Format.TypeFormat.Formula]: {},
  [Format.TypeFormat.Hostname]: {},
  [Format.TypeFormat.JSON]: {},
  [Format.TypeFormat.Markdown]: {},
  [Format.TypeFormat.Regex]: {},
  [Format.TypeFormat.URL]: {},
  [Format.TypeFormat.UUID]: {},
  [Format.TypeFormat.SingleSelect]: {},
  [Format.TypeFormat.MultiSelect]: {},
  [Format.TypeFormat.Currency]: {},
  [Format.TypeFormat.Integer]: {},
  [Format.TypeFormat.Percent]: {},
  [Format.TypeFormat.Timestamp]: {},
  [Format.TypeFormat.Text]: {},
  [Format.TypeFormat.DateTime]: {},
  [Format.TypeFormat.Date]: {},
  [Format.TypeFormat.Time]: {},
  [Format.TypeFormat.Duration]: {},
  [Format.TypeFormat.GeoPoint]: {
    items: [
      { title: 'Longitude', type: TypeEnum.Number },
      { title: 'Latitude', type: TypeEnum.Number },
      { title: 'Height ASL (m)', type: TypeEnum.Number },
    ],
    minItems: 2,
    additionalItems: false,
  },
};

export const getFormatSchema = (format?: Format.TypeFormat): Schema.Schema.AnyNoContext => {
  if (format === undefined) {
    return formatToSchema[Format.TypeFormat.None];
  }

  return formatToSchema[format] ?? formatToSchema[Format.TypeFormat.None];
};
