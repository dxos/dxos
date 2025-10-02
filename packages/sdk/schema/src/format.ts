//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import {
  DecimalPrecision,
  FormatEnum,
  JsonProp,
  type JsonSchemaType,
  type SelectOption,
  SelectOptionSchema,
  TypeEnum,
} from '@dxos/echo-schema';

/**
 * Base schema.
 */
export const BasePropertySchema = Schema.Struct({
  property: JsonProp.annotations({
    title: 'Property',
    description: 'Field name.',
  }),

  title: Schema.optional(
    Schema.String.annotations({
      title: 'Label',
      description: 'Property label.',
    }),
  ),

  description: Schema.optional(
    Schema.String.annotations({
      title: 'Description',
      description: 'Property description.',
    }),
  ),
});

export type BaseProperty = Schema.Schema.Type<typeof BasePropertySchema>;

const extend = <Fields extends Schema.Struct.Fields>(format: FormatEnum, type: TypeEnum, fields?: Fields) =>
  Schema.extend(
    BasePropertySchema,
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
  format: FormatEnum;
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
export const formatToSchema: Record<FormatEnum, Schema.Schema<FormatSchemaCommon>> = {
  [FormatEnum.None]: Schema.extend(
    BasePropertySchema,
    Schema.Struct({
      type: Schema.Enums(TypeEnum),
      format: Schema.Literal(FormatEnum.None) as Schema.Schema<FormatEnum>,
    }),
  ).pipe(Schema.mutable),

  //
  // Scalars
  //

  [FormatEnum.String]: extend(FormatEnum.String, TypeEnum.String),
  [FormatEnum.Number]: extend(FormatEnum.Number, TypeEnum.Number),
  [FormatEnum.Boolean]: extend(FormatEnum.Boolean, TypeEnum.Boolean),
  [FormatEnum.Ref]: extend(FormatEnum.Ref, TypeEnum.Ref, {
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

  [FormatEnum.DID]: extend(FormatEnum.DID, TypeEnum.String),
  [FormatEnum.DXN]: extend(FormatEnum.DXN, TypeEnum.String),
  [FormatEnum.Email]: extend(FormatEnum.Email, TypeEnum.String),
  [FormatEnum.Formula]: extend(FormatEnum.Formula, TypeEnum.String),
  [FormatEnum.Hostname]: extend(FormatEnum.Hostname, TypeEnum.String),
  [FormatEnum.JSON]: extend(FormatEnum.JSON, TypeEnum.String),
  [FormatEnum.Markdown]: extend(FormatEnum.Markdown, TypeEnum.String),
  [FormatEnum.Regex]: extend(FormatEnum.Regex, TypeEnum.String),
  [FormatEnum.URL]: extend(FormatEnum.URL, TypeEnum.String),
  [FormatEnum.UUID]: extend(FormatEnum.UUID, TypeEnum.String),

  //
  // Select
  //

  [FormatEnum.SingleSelect]: extend(FormatEnum.SingleSelect, TypeEnum.String, {
    options: Schema.Array(SelectOptionSchema).annotations({
      title: 'Options',
      description: 'Available choices',
    }),
  }),

  [FormatEnum.MultiSelect]: extend(FormatEnum.MultiSelect, TypeEnum.Object, {
    options: Schema.Array(SelectOptionSchema).annotations({
      title: 'Options',
      description: 'Available choices',
    }),
  }),

  //
  // Numbers
  //

  [FormatEnum.Currency]: extend(FormatEnum.Currency, TypeEnum.Number, {
    multipleOf: Schema.optional(DecimalPrecision),
    currency: Schema.optional(
      Schema.String.annotations({
        title: 'Currency code',
        description: 'ISO 4217 currency code.',
      }),
    ),
  }),
  [FormatEnum.Integer]: extend(FormatEnum.Integer, TypeEnum.Number),
  [FormatEnum.Percent]: extend(FormatEnum.Percent, TypeEnum.Number, {
    multipleOf: Schema.optional(DecimalPrecision),
  }),
  [FormatEnum.Timestamp]: extend(FormatEnum.Timestamp, TypeEnum.Number),

  //
  // Dates
  //

  [FormatEnum.DateTime]: extend(FormatEnum.DateTime, TypeEnum.String),
  [FormatEnum.Date]: extend(FormatEnum.Date, TypeEnum.String),
  [FormatEnum.Time]: extend(FormatEnum.Time, TypeEnum.String),
  [FormatEnum.Duration]: extend(FormatEnum.Duration, TypeEnum.String),

  //
  // Objects
  //

  // TODO(wittjosiah): Doesn't align with getSimpleType where Tuples are treated as objects.
  [FormatEnum.GeoPoint]: extend(FormatEnum.GeoPoint, TypeEnum.Array, {
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
  formatToSchema[FormatEnum.None],
  formatToSchema[FormatEnum.String],
  formatToSchema[FormatEnum.Number],
  formatToSchema[FormatEnum.Boolean],
  formatToSchema[FormatEnum.Ref],

  //
  // Strings
  //

  formatToSchema[FormatEnum.DID],
  formatToSchema[FormatEnum.DXN],
  formatToSchema[FormatEnum.Email],
  formatToSchema[FormatEnum.Formula],
  formatToSchema[FormatEnum.Hostname],
  formatToSchema[FormatEnum.JSON],
  formatToSchema[FormatEnum.Markdown],
  formatToSchema[FormatEnum.Regex],
  formatToSchema[FormatEnum.URL],
  formatToSchema[FormatEnum.UUID],
  formatToSchema[FormatEnum.SingleSelect],
  formatToSchema[FormatEnum.MultiSelect],

  //
  // Numbers
  //

  formatToSchema[FormatEnum.Currency],
  formatToSchema[FormatEnum.Integer],
  formatToSchema[FormatEnum.Percent],
  formatToSchema[FormatEnum.Timestamp],

  //
  // Dates
  //

  formatToSchema[FormatEnum.DateTime],
  formatToSchema[FormatEnum.Date],
  formatToSchema[FormatEnum.Time],
  formatToSchema[FormatEnum.Duration],

  //
  // Objects
  //

  formatToSchema[FormatEnum.GeoPoint],
);

export interface PropertyType extends Schema.Simplify<Schema.Schema.Type<typeof PropertySchema>> {}

export const formatToAdditionalPropertyAttributes: Record<FormatEnum, Partial<JsonSchemaType>> = {
  [FormatEnum.None]: {},
  [FormatEnum.String]: {},
  [FormatEnum.Number]: {},
  [FormatEnum.Boolean]: {},
  [FormatEnum.Ref]: {},
  [FormatEnum.DID]: {},
  [FormatEnum.DXN]: {},
  [FormatEnum.Email]: {},
  [FormatEnum.Formula]: {},
  [FormatEnum.Hostname]: {},
  [FormatEnum.JSON]: {},
  [FormatEnum.Markdown]: {},
  [FormatEnum.Regex]: {},
  [FormatEnum.URL]: {},
  [FormatEnum.UUID]: {},
  [FormatEnum.SingleSelect]: {},
  [FormatEnum.MultiSelect]: {},
  [FormatEnum.Currency]: {},
  [FormatEnum.Integer]: {},
  [FormatEnum.Percent]: {},
  [FormatEnum.Timestamp]: {},
  [FormatEnum.DateTime]: {},
  [FormatEnum.Date]: {},
  [FormatEnum.Time]: {},
  [FormatEnum.Duration]: {},
  [FormatEnum.GeoPoint]: {
    items: [
      { title: 'Longitude', type: TypeEnum.Number },
      { title: 'Latitude', type: TypeEnum.Number },
      { title: 'Height ASL (m)', type: TypeEnum.Number },
    ],
    minItems: 2,
    additionalItems: false,
  },
};

export const getFormatSchema = (format?: FormatEnum): Schema.Schema.AnyNoContext => {
  if (format === undefined) {
    return formatToSchema[FormatEnum.None];
  }

  return formatToSchema[format] ?? formatToSchema[FormatEnum.None];
};
