//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  DecimalPrecision,
  JsonProp,
  type JsonSchemaType,
  type SelectOption,
  SelectOptionSchema,
  TypeEnum,
  TypeFormat,
} from '@dxos/echo/internal';

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

const extend = <Fields extends Schema.Struct.Fields>(format: TypeFormat, type: TypeEnum, fields?: Fields) =>
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
  format: TypeFormat;
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
export const formatToSchema: Record<TypeFormat, Schema.Schema<FormatSchemaCommon>> = {
  [TypeFormat.None]: Schema.extend(
    BasePropertySchema,
    Schema.Struct({
      type: Schema.Enums(TypeEnum),
      format: Schema.Literal(TypeFormat.None) as Schema.Schema<TypeFormat>,
    }),
  ).pipe(Schema.mutable),

  //
  // Scalars
  //

  [TypeFormat.String]: extend(TypeFormat.String, TypeEnum.String),
  [TypeFormat.Number]: extend(TypeFormat.Number, TypeEnum.Number),
  [TypeFormat.Boolean]: extend(TypeFormat.Boolean, TypeEnum.Boolean),
  [TypeFormat.Ref]: extend(TypeFormat.Ref, TypeEnum.Ref, {
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

  [TypeFormat.DID]: extend(TypeFormat.DID, TypeEnum.String),
  [TypeFormat.DXN]: extend(TypeFormat.DXN, TypeEnum.String),
  [TypeFormat.Email]: extend(TypeFormat.Email, TypeEnum.String),
  [TypeFormat.Formula]: extend(TypeFormat.Formula, TypeEnum.String),
  [TypeFormat.Hostname]: extend(TypeFormat.Hostname, TypeEnum.String),
  [TypeFormat.JSON]: extend(TypeFormat.JSON, TypeEnum.String),
  [TypeFormat.Markdown]: extend(TypeFormat.Markdown, TypeEnum.String),
  [TypeFormat.Regex]: extend(TypeFormat.Regex, TypeEnum.String),
  [TypeFormat.URL]: extend(TypeFormat.URL, TypeEnum.String),
  [TypeFormat.UUID]: extend(TypeFormat.UUID, TypeEnum.String),

  //
  // Select
  //

  [TypeFormat.SingleSelect]: extend(TypeFormat.SingleSelect, TypeEnum.String, {
    options: Schema.Array(SelectOptionSchema).annotations({
      title: 'Options',
      description: 'Available choices',
    }),
  }),

  [TypeFormat.MultiSelect]: extend(TypeFormat.MultiSelect, TypeEnum.Object, {
    options: Schema.Array(SelectOptionSchema).annotations({
      title: 'Options',
      description: 'Available choices',
    }),
  }),

  //
  // Numbers
  //

  [TypeFormat.Currency]: extend(TypeFormat.Currency, TypeEnum.Number, {
    multipleOf: Schema.optional(DecimalPrecision),
    currency: Schema.optional(
      Schema.String.annotations({
        title: 'Currency code',
        description: 'ISO 4217 currency code.',
      }),
    ),
  }),
  [TypeFormat.Integer]: extend(TypeFormat.Integer, TypeEnum.Number),
  [TypeFormat.Percent]: extend(TypeFormat.Percent, TypeEnum.Number, {
    multipleOf: Schema.optional(DecimalPrecision),
  }),
  [TypeFormat.Timestamp]: extend(TypeFormat.Timestamp, TypeEnum.Number),

  //
  // Dates
  //

  [TypeFormat.DateTime]: extend(TypeFormat.DateTime, TypeEnum.String),
  [TypeFormat.Date]: extend(TypeFormat.Date, TypeEnum.String),
  [TypeFormat.Time]: extend(TypeFormat.Time, TypeEnum.String),
  [TypeFormat.Duration]: extend(TypeFormat.Duration, TypeEnum.String),

  //
  // Objects
  //

  // TODO(wittjosiah): Doesn't align with getSimpleType where Tuples are treated as objects.
  [TypeFormat.GeoPoint]: extend(TypeFormat.GeoPoint, TypeEnum.Array, {
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
  formatToSchema[TypeFormat.None],
  formatToSchema[TypeFormat.String],
  formatToSchema[TypeFormat.Number],
  formatToSchema[TypeFormat.Boolean],
  formatToSchema[TypeFormat.Ref],

  //
  // Strings
  //

  formatToSchema[TypeFormat.DID],
  formatToSchema[TypeFormat.DXN],
  formatToSchema[TypeFormat.Email],
  formatToSchema[TypeFormat.Formula],
  formatToSchema[TypeFormat.Hostname],
  formatToSchema[TypeFormat.JSON],
  formatToSchema[TypeFormat.Markdown],
  formatToSchema[TypeFormat.Regex],
  formatToSchema[TypeFormat.URL],
  formatToSchema[TypeFormat.UUID],
  formatToSchema[TypeFormat.SingleSelect],
  formatToSchema[TypeFormat.MultiSelect],

  //
  // Numbers
  //

  formatToSchema[TypeFormat.Currency],
  formatToSchema[TypeFormat.Integer],
  formatToSchema[TypeFormat.Percent],
  formatToSchema[TypeFormat.Timestamp],

  //
  // Dates
  //

  formatToSchema[TypeFormat.DateTime],
  formatToSchema[TypeFormat.Date],
  formatToSchema[TypeFormat.Time],
  formatToSchema[TypeFormat.Duration],

  //
  // Objects
  //

  formatToSchema[TypeFormat.GeoPoint],
);

export interface PropertyType extends Schema.Simplify<Schema.Schema.Type<typeof PropertySchema>> {}

export const formatToAdditionalPropertyAttributes: Record<TypeFormat, Partial<JsonSchemaType>> = {
  [TypeFormat.None]: {},
  [TypeFormat.String]: {},
  [TypeFormat.Number]: {},
  [TypeFormat.Boolean]: {},
  [TypeFormat.Ref]: {},
  [TypeFormat.DID]: {},
  [TypeFormat.DXN]: {},
  [TypeFormat.Email]: {},
  [TypeFormat.Formula]: {},
  [TypeFormat.Hostname]: {},
  [TypeFormat.JSON]: {},
  [TypeFormat.Markdown]: {},
  [TypeFormat.Regex]: {},
  [TypeFormat.URL]: {},
  [TypeFormat.UUID]: {},
  [TypeFormat.SingleSelect]: {},
  [TypeFormat.MultiSelect]: {},
  [TypeFormat.Currency]: {},
  [TypeFormat.Integer]: {},
  [TypeFormat.Percent]: {},
  [TypeFormat.Timestamp]: {},
  [TypeFormat.DateTime]: {},
  [TypeFormat.Date]: {},
  [TypeFormat.Time]: {},
  [TypeFormat.Duration]: {},
  [TypeFormat.GeoPoint]: {
    items: [
      { title: 'Longitude', type: TypeEnum.Number },
      { title: 'Latitude', type: TypeEnum.Number },
      { title: 'Height ASL (m)', type: TypeEnum.Number },
    ],
    minItems: 2,
    additionalItems: false,
  },
};

export const getFormatSchema = (format?: TypeFormat): Schema.Schema.AnyNoContext => {
  if (format === undefined) {
    return formatToSchema[TypeFormat.None];
  }

  return formatToSchema[format] ?? formatToSchema[TypeFormat.None];
};
