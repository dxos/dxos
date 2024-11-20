//
// Copyright 2024 DXOS.org
//

import { AST, DecimalPrecision, TypeEnum, FormatEnum, S, JsonProp } from '@dxos/echo-schema';

/**
 * Base schema.
 */
export const BasePropertySchema = S.Struct({
  property: JsonProp.annotations({
    [AST.TitleAnnotationId]: 'Property',
    [AST.DescriptionAnnotationId]: 'Field name.',
  }),

  title: S.optional(
    S.String.annotations({
      [AST.TitleAnnotationId]: 'Label',
      [AST.DescriptionAnnotationId]: 'Property label.',
    }),
  ),

  description: S.optional(
    S.String.annotations({
      [AST.TitleAnnotationId]: 'Description',
      [AST.DescriptionAnnotationId]: 'Property description.',
    }),
  ),
});

export type BaseProperty = S.Schema.Type<typeof BasePropertySchema>;

const extend = <Fields extends S.Struct.Fields>(format: FormatEnum, type: TypeEnum, fields?: Fields) =>
  S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(type),
      format: S.Literal(format).annotations({
        [AST.TitleAnnotationId]: 'Type format',
      }),
      ...fields,
    }),
  ).pipe(S.mutable);

interface FormatSchemaCommon extends BaseProperty {
  type: TypeEnum;
  format: FormatEnum;
  multipleOf?: number;
  currency?: string;
  referenceSchema?: string;
  referencePath?: string;
}

/**
 * Map of schema definitions.
 */
// TODO(burdon): Translations?
export const formatToSchema: Record<FormatEnum, S.Schema<FormatSchemaCommon>> = {
  [FormatEnum.None]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Enums(TypeEnum),
      format: S.Literal(FormatEnum.None) as S.Schema<FormatEnum>,
    }),
  ).pipe(S.mutable),

  //
  // Scalars
  //

  [FormatEnum.String]: extend(FormatEnum.String, TypeEnum.String),
  [FormatEnum.Number]: extend(FormatEnum.Number, TypeEnum.Number),
  [FormatEnum.Boolean]: extend(FormatEnum.Boolean, TypeEnum.Boolean),
  [FormatEnum.Ref]: extend(FormatEnum.Ref, TypeEnum.Ref, {
    referenceSchema: S.NonEmptyString.annotations({
      [AST.TitleAnnotationId]: 'Schema',
      [AST.DescriptionAnnotationId]: 'Schema typename.',
    }),
    referencePath: S.optional(
      JsonProp.annotations({
        [AST.TitleAnnotationId]: 'Lookup property',
        [AST.DescriptionAnnotationId]: 'Referenced property.',
      }),
    ),
  }),

  //
  // Strings
  //

  [FormatEnum.DID]: extend(FormatEnum.DID, TypeEnum.String),
  [FormatEnum.Email]: extend(FormatEnum.Email, TypeEnum.String),
  [FormatEnum.Formula]: extend(FormatEnum.Formula, TypeEnum.String),
  [FormatEnum.Hostname]: extend(FormatEnum.Markdown, TypeEnum.String),
  [FormatEnum.JSON]: extend(FormatEnum.JSON, TypeEnum.String),
  [FormatEnum.Markdown]: extend(FormatEnum.Markdown, TypeEnum.String),
  [FormatEnum.Regex]: extend(FormatEnum.Regex, TypeEnum.String),
  [FormatEnum.URI]: extend(FormatEnum.URI, TypeEnum.String),
  [FormatEnum.UUID]: extend(FormatEnum.UUID, TypeEnum.String),

  //
  // Numbers
  //

  [FormatEnum.Currency]: extend(FormatEnum.Currency, TypeEnum.Number, {
    multipleOf: S.optional(DecimalPrecision),
    currency: S.optional(
      S.String.annotations({
        [AST.TitleAnnotationId]: 'Currency code',
        [AST.DescriptionAnnotationId]: 'ISO 4217 currency code.',
      }),
    ),
  }),
  [FormatEnum.Integer]: extend(FormatEnum.Integer, TypeEnum.Number),
  [FormatEnum.Percent]: extend(FormatEnum.Percent, TypeEnum.Number, {
    multipleOf: S.optional(DecimalPrecision),
  }),
  [FormatEnum.Timestamp]: extend(FormatEnum.UUID, TypeEnum.Number),

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

  [FormatEnum.LatLng]: extend(FormatEnum.LatLng, TypeEnum.Object),
};

/**
 * Discriminated union of schema based on format.
 * This is the schema used by the ViewEditor's Form.
 * It is mapped to/from the View's Field AND Schema properties via the ViewProjection.
 */
export const PropertySchema = S.Union(
  formatToSchema[FormatEnum.None],
  formatToSchema[FormatEnum.String],
  formatToSchema[FormatEnum.Number],
  formatToSchema[FormatEnum.Boolean],
  formatToSchema[FormatEnum.Ref],

  //
  // Strings
  //

  formatToSchema[FormatEnum.DID],
  formatToSchema[FormatEnum.Email],
  formatToSchema[FormatEnum.Formula],
  formatToSchema[FormatEnum.Hostname],
  formatToSchema[FormatEnum.JSON],
  formatToSchema[FormatEnum.Markdown],
  formatToSchema[FormatEnum.Regex],
  formatToSchema[FormatEnum.URI],
  formatToSchema[FormatEnum.UUID],

  //
  // Numbers
  //

  formatToSchema[FormatEnum.Currency],
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

  formatToSchema[FormatEnum.LatLng],
);

export interface PropertyType extends S.Simplify<S.Schema.Type<typeof PropertySchema>> {}

export const getFormatSchema = (format?: FormatEnum): S.Schema<any> => {
  if (format === undefined) {
    return formatToSchema[FormatEnum.None];
  }

  return formatToSchema[format] ?? formatToSchema[FormatEnum.None];
};
