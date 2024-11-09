//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { FormatEnum, TypeEnum } from '@dxos/echo-schema';
import { AST, type S, visit } from '@dxos/effect';

import { type FieldType } from './view';

// TODO(burdon): Remove once deprecated table is removed.

/**
 * @deprecated
 */
export const getFieldValue = <T extends object = {}, V = any>(
  object: T,
  field: FieldType,
  defaultValue?: V,
): V | undefined => (jp.value(object, '$.' + field.property) as V) ?? defaultValue;

/**
 * @deprecated
 */
export const setFieldValue = <T extends object = {}, V = any>(object: T, field: FieldType, value: V): V =>
  jp.value(object, '$.' + field.property, value);

/**
 * @deprecated
 */
export type SchemaFieldDescription = {
  property: string;
  type: TypeEnum;
  format?: FormatEnum;
};

/**
 * @deprecated
 */
export const mapSchemaToFields = (schema: S.Schema<any, any>): SchemaFieldDescription[] => {
  const fields = [] as SchemaFieldDescription[];
  visit(schema.ast, (node, path) => {
    const { type, format } = toFieldValueType(node);
    fields.push({ property: path.join('.'), type, format });
  });

  return fields;
};

const toFieldValueType = (type: AST.AST): { format?: FormatEnum; type: TypeEnum } => {
  if (AST.isTypeLiteral(type)) {
    return { type: TypeEnum.Ref, format: FormatEnum.Ref };
  } else if (AST.isNumberKeyword(type)) {
    return { type: TypeEnum.Number };
  } else if (AST.isBooleanKeyword(type)) {
    return { type: TypeEnum.Boolean };
  } else if (AST.isStringKeyword(type)) {
    return { type: TypeEnum.String };
  }

  if (AST.isRefinement(type)) {
    return toFieldValueType(type.from);
  }

  // TODO(zan): How should we be thinking about transformations?
  //  See https://effect.website/docs/guides/schema/projections
  //  - Which of these are we storing in the database?
  //  - For types that aren't the 'DateFromString' transformation, should we be using the 'from' or 'to' type?
  if (AST.isTransformation(type)) {
    const identifier = AST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return { type: TypeEnum.String, format: FormatEnum.Date };
      }
    }
  }

  // TODO(burdon): Better fallback?
  return { type: TypeEnum.String, format: FormatEnum.JSON };
};
