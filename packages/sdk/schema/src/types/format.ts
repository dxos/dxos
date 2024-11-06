//
// Copyright 2024 DXOS.org
//

import { AST, ScalarEnum, FormatEnum, S, getScalarTypeFromAst } from '@dxos/echo-schema';
import { getType, getAnnotation } from '@dxos/effect';

/**
 * Convert number of digits to multipleOf annotation.
 */
export const DecimalPrecision = S.transform(S.Number, S.Number, {
  strict: true,
  encode: (value) => Math.pow(10, -value),
  decode: (value) => Math.log10(1 / value),
}).annotations({
  [AST.TitleAnnotationId]: 'Number of digits',
});

/**
 * Base schema.
 */
export const BasePropertySchema = S.Struct({
  property: S.String.annotations({ [AST.TitleAnnotationId]: 'Property' }).pipe(S.pattern(/\w+/)),
  title: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Title' })),
  description: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Description' })),
});

export type BaseProperty = S.Schema.Type<typeof BasePropertySchema>;

/**
 * Map of schema definitions.
 */
// TODO(burdon): Translations?
export const FormatSchema: Record<FormatEnum, S.Schema<any>> = {
  [FormatEnum.None]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Enums(ScalarEnum),
      format: S.Literal(FormatEnum.None),
    }),
  ).pipe(S.mutable),

  //
  // Scalars
  //

  [FormatEnum.String]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.String),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Number]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.Number),
      format: S.Literal(FormatEnum.Number),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Boolean]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.Boolean),
      format: S.Literal(FormatEnum.Boolean),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Ref]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.Ref),
      format: S.Literal(FormatEnum.Ref),
      refSchema: S.NonEmptyString.annotations({ [AST.TitleAnnotationId]: 'Schema' }),
      // TODO(burdon): Annotation to store on View's field (not schema property?)
      refProperty: S.NonEmptyString.annotations({ [AST.TitleAnnotationId]: 'Lookup' }),
    }),
  ).pipe(S.mutable),

  //
  // Strings
  //

  [FormatEnum.DID]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.DID),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Email]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Email),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Formula]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Formula),
    }),
  ).pipe(S.mutable),

  [FormatEnum.JSON]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.JSON),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Regex]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Regex),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Text]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Text),
    }),
  ).pipe(S.mutable),

  [FormatEnum.URI]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.URI),
    }),
  ).pipe(S.mutable),

  [FormatEnum.UUID]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.UUID),
    }),
  ).pipe(S.mutable),

  //
  // Numbers
  //

  [FormatEnum.Currency]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.Number),
      format: S.Literal(FormatEnum.Currency),
      multipleOf: S.optional(DecimalPrecision),
      currency: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Currency code' })),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Percent]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.Number),
      format: S.Literal(FormatEnum.Percent),
      multipleOf: S.optional(DecimalPrecision),
    }),
  ).pipe(S.mutable),

  [FormatEnum.Timestamp]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.Number),
      format: S.Literal(FormatEnum.Timestamp),
    }),
  ).pipe(S.mutable),

  //
  // Dates
  //

  [FormatEnum.DateTime]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.DateTime),
    }),
  ),

  [FormatEnum.Date]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Date),
    }),
  ),

  [FormatEnum.Time]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Time),
    }),
  ),

  [FormatEnum.Duration]: S.extend(
    BasePropertySchema,
    S.Struct({
      type: S.Literal(ScalarEnum.String),
      format: S.Literal(FormatEnum.Duration),
    }),
  ),
};

/**
 * Discriminated union of schema based on format.
 */
export const PropertySchema = S.Union(
  //
  // Scalars
  //

  FormatSchema[FormatEnum.None],
  FormatSchema[FormatEnum.String],
  FormatSchema[FormatEnum.Number],
  FormatSchema[FormatEnum.Boolean],
  FormatSchema[FormatEnum.Ref],

  //
  // Strings
  //

  FormatSchema[FormatEnum.DID],
  FormatSchema[FormatEnum.Email],
  FormatSchema[FormatEnum.Formula],
  FormatSchema[FormatEnum.JSON],
  FormatSchema[FormatEnum.Regex],
  FormatSchema[FormatEnum.Text],
  FormatSchema[FormatEnum.URI],
  FormatSchema[FormatEnum.UUID],

  //
  // Numbers
  //

  FormatSchema[FormatEnum.Currency],
  FormatSchema[FormatEnum.Percent],
  FormatSchema[FormatEnum.Timestamp],

  //
  // Dates
  //

  FormatSchema[FormatEnum.DateTime],
  FormatSchema[FormatEnum.Date],
  FormatSchema[FormatEnum.Time],
  FormatSchema[FormatEnum.Duration],
);

export type PropertyType = S.Schema.Type<typeof PropertySchema>;

/**
 * Retrieves the schema definition for the given format.
 */
export const getPropertySchemaForFormat = (format?: FormatEnum): S.Schema<any> | undefined => {
  if (format === undefined) {
    return FormatSchema[FormatEnum.None];
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
  name: string & keyof T;
  type: ScalarEnum;
  label?: string;
};

/**
 * Get top-level properties from schema.
 */
export const getSchemaProperties = <T>(schema: S.Schema<T>): SchemaPropertyType<T>[] => {
  return AST.getPropertySignatures(schema.ast).reduce<SchemaPropertyType<T>[]>((props, prop) => {
    let propType = getType(prop.type);
    if (propType) {
      let label = propType ? getAnnotation<string>(AST.TitleAnnotationId, propType) : undefined;
      // NOTE: Ignores type literals.
      let type = getScalarTypeFromAst(propType);
      if (!type && AST.isTransformation(propType)) {
        label = getAnnotation<string>(AST.TitleAnnotationId, propType);
        propType = getType(propType.to);
        if (propType) {
          type = getScalarTypeFromAst(propType);
        }
      }

      if (type) {
        props.push({ name: prop.name.toString() as any, type, label });
      }
    }

    return props;
  }, []);
};
