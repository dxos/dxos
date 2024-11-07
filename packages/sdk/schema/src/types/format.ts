//
// Copyright 2024 DXOS.org
//

import { AST, DecimalPrecision, TypeEnum, FormatEnum, S, JsonPath } from '@dxos/echo-schema';
import { getBaseType, getAnnotation } from '@dxos/effect';

/**
 * Base schema.
 */
export const BasePropertySchema = S.Struct({
  property: S.String.annotations({ [AST.TitleAnnotationId]: 'Property' }).pipe(S.pattern(/\w+/)),
  title: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Title' })),
  description: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Description' })),
});

export type BaseProperty = S.Schema.Type<typeof BasePropertySchema>;

const extend = (format: FormatEnum, type: TypeEnum, fields = {}) =>
  S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(type),
      format: S.Literal(format),
      ...fields,
    }),
  ).pipe(S.mutable);

/**
 * Map of schema definitions.
 */
// TODO(burdon): Translations?
export const formatToSchema: Record<FormatEnum, S.Schema<any>> = {
  [FormatEnum.None]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Enums(TypeEnum),
      format: S.Literal(FormatEnum.None),
    }),
  ).pipe(S.mutable),

  //
  // Scalars
  //

  [FormatEnum.String]: extend(FormatEnum.String, TypeEnum.String),
  [FormatEnum.Number]: extend(FormatEnum.Number, TypeEnum.Number),
  [FormatEnum.Boolean]: extend(FormatEnum.Boolean, TypeEnum.Boolean),
  [FormatEnum.Ref]: extend(FormatEnum.Ref, TypeEnum.Ref, {
    referenceSchema: S.NonEmptyString.annotations({ [AST.TitleAnnotationId]: 'Schema' }),
    referenceProperty: S.optional(JsonPath.annotations({ [AST.TitleAnnotationId]: 'Lookup property' })),
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
    currency: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Currency code' })),
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

export interface PropertyType extends S.Schema.Type<typeof PropertySchema> {}

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

export type SchemaPropertyType<T> = {
  property: string & keyof T;
  type: TypeEnum;
  format: FormatEnum;
  title?: string;
};

/**
 * Get top-level properties from schema.
 * NOTE: Type literals are ignored (e.g., fixed type/format fields).
 */
export const getSchemaProperties = <T>(schema: S.Schema<T>): SchemaPropertyType<T>[] => {
  return AST.getPropertySignatures(schema.ast).reduce<SchemaPropertyType<T>[]>((props, prop) => {
    const propType = getBaseType(prop.type);
    if (!propType) {
      console.log('=>>', prop.type);
    }
    if (propType) {
      let type = getTypeEnumFrom(propType);
      let title = getAnnotation<string>(AST.TitleAnnotationId, propType);
      if (!type && AST.isTransformation(propType)) {
        title = getAnnotation<string>(AST.TitleAnnotationId, propType);
        type = getTypeEnumFrom(propType.to);
      }

      if (type) {
        props.push({ property: prop.name.toString() as any, type, format: FormatEnum.None, title });
      }
    }

    return props;
  }, []);
};

const getTypeEnumFrom = (ast: AST.AST): TypeEnum | undefined => {
  if (AST.isStringKeyword(ast)) {
    return TypeEnum.String;
  } else if (AST.isNumberKeyword(ast)) {
    return TypeEnum.Number;
  } else if (AST.isBooleanKeyword(ast)) {
    return TypeEnum.Boolean;
  }
};
