//
// Copyright 2024 DXOS.org
//

import { AST, DecimalPrecision, TypeEnum, FormatEnum, S, JsonProp } from '@dxos/echo-schema';
import { findNode, findAnnotation, isSimpleType } from '@dxos/effect';

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

const extend = (format: FormatEnum, type: TypeEnum, fields: S.Struct.Fields = {}) =>
  S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(type),
      format: S.Literal(format).annotations({
        [AST.TitleAnnotationId]: 'Property format',
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
 * It is mapped to/from the View's Field and Schema properties via the ViewProjection.
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
);

export interface PropertyType extends S.Simplify<S.Schema.Type<typeof PropertySchema>> {}

/**
 * Retrieves the schema definition for the given format.
 */
export const getPropertySchemaForFormat = (format?: FormatEnum): S.Schema<any> | undefined => {
  if (format === undefined) {
    return formatToSchema[FormatEnum.None];
  }

  for (const member of PropertySchema.members) {
    for (const prop of AST.getPropertySignatures(member.ast)) {
      if (prop.name === 'format' && prop.type._tag === 'Literal' && prop.type.literal === format) {
        return member;
      }
    }
  }

  return undefined;
};

const noDefault = (value?: string, defaultValue?: string): string | undefined =>
  (value === 'a string' ? undefined : value) ?? defaultValue;

export type SchemaProperty<T> = {
  property: string & keyof T;
  type?: TypeEnum;
  title?: string;
  description?: string;
};

/**
 * Get top-level properties from schema.
 */
// TODO(burdon): Factor out (generic).
export const getSchemaProperties = <T>(schema: S.Schema<T>): SchemaProperty<T>[] => {
  return AST.getPropertySignatures(schema.ast).reduce<SchemaProperty<T>[]>((props, prop) => {
    const property = prop.name.toString() as JsonProp & keyof T;
    const title = noDefault(findAnnotation<string>(prop.type, AST.TitleAnnotationId));
    const description = noDefault(findAnnotation<string>(prop.type, AST.DescriptionAnnotationId));
    const baseType = findNode(prop.type, isSimpleType);
    if (baseType) {
      const type = getTypeEnum(baseType);
      if (type) {
        props.push({ property, type, title, description });
      } else if (AST.isLiteral(baseType)) {
        props.push({ property, title, description });
      }
    } else {
      const type = findNode(prop.type, AST.isTransformation);
      if (type && AST.isTransformation(type)) {
        props.push({ property, type: getTypeEnum(type.from), title, description });
      }
    }

    return props;
  }, []);
};

const getTypeEnum = (node: AST.AST): TypeEnum | undefined => {
  if (AST.isStringKeyword(node)) {
    return TypeEnum.String;
  }
  if (AST.isNumberKeyword(node)) {
    return TypeEnum.Number;
  }
  if (AST.isBooleanKeyword(node)) {
    return TypeEnum.Boolean;
  }
};
