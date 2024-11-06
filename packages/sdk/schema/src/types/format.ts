//
// Copyright 2024 DXOS.org
//

import { AST, ScalarEnum, FormatEnum, S, getScalarTypeFromAst } from '@dxos/echo-schema';
import { getType, getAnnotation } from '@dxos/effect';
import { log } from '@dxos/log';
import { expect } from 'vitest';

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

const extend = (format: FormatEnum, type: ScalarEnum, fields = {}) =>
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

  [FormatEnum.String]: extend(FormatEnum.String, ScalarEnum.String),
  [FormatEnum.Number]: extend(FormatEnum.Number, ScalarEnum.Number),
  [FormatEnum.Boolean]: extend(FormatEnum.Boolean, ScalarEnum.Boolean),
  [FormatEnum.Ref]: extend(FormatEnum.Ref, ScalarEnum.Ref, {
    refSchema: S.NonEmptyString.annotations({ [AST.TitleAnnotationId]: 'Schema' }),
    // TODO(burdon): Annotation to store on View's field (not schema property?)
    refProperty: S.NonEmptyString.annotations({ [AST.TitleAnnotationId]: 'Lookup property' }),
  }),

  //
  // Strings
  //

  [FormatEnum.DID]: extend(FormatEnum.DID, ScalarEnum.String),
  [FormatEnum.Email]: extend(FormatEnum.Email, ScalarEnum.String),
  [FormatEnum.Formula]: extend(FormatEnum.Formula, ScalarEnum.String),
  [FormatEnum.JSON]: extend(FormatEnum.JSON, ScalarEnum.String),
  [FormatEnum.Regex]: extend(FormatEnum.Regex, ScalarEnum.String),
  [FormatEnum.Text]: extend(FormatEnum.Text, ScalarEnum.String),
  [FormatEnum.URI]: extend(FormatEnum.URI, ScalarEnum.String),
  [FormatEnum.UUID]: extend(FormatEnum.UUID, ScalarEnum.String),

  //
  // Numbers
  //

  [FormatEnum.Currency]: extend(FormatEnum.Currency, ScalarEnum.Number, {
    multipleOf: S.optional(DecimalPrecision),
    currency: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Currency code' })),
  }),
  [FormatEnum.Percent]: extend(FormatEnum.Percent, ScalarEnum.Number, {
    multipleOf: S.optional(DecimalPrecision),
  }),
  [FormatEnum.Timestamp]: extend(FormatEnum.UUID, ScalarEnum.Number),

  //
  // Dates
  //

  [FormatEnum.DateTime]: extend(FormatEnum.DateTime, ScalarEnum.String),
  [FormatEnum.Date]: extend(FormatEnum.Date, ScalarEnum.String),
  [FormatEnum.Time]: extend(FormatEnum.Time, ScalarEnum.String),
  [FormatEnum.Duration]: extend(FormatEnum.Duration, ScalarEnum.String),
};

/**
 * Discriminated union of schema based on format.
 */
export const PropertySchema = S.Union(
  FormatSchema[FormatEnum.None],

  //
  // Scalars
  //

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
