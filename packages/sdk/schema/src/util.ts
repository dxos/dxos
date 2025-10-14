//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
// TODO(burdon): Move to jsonpath-plus.
import jp from 'jsonpath';

import { type BaseObject, FormatEnum, type JsonSchemaType, TypeEnum } from '@dxos/echo-schema';
import { visit } from '@dxos/effect';

import { type FieldType } from './view';

// TODO(burdon): Remove once deprecated table is removed.

/**
 * @deprecated
 */
export const getFieldValue = <T extends BaseObject, V = any>(
  object: T,
  field: FieldType,
  defaultValue?: V,
): V | undefined => (jp.value(object, '$.' + field.path) as V) ?? defaultValue;

/**
 * @deprecated
 */
export const setFieldValue = <T extends BaseObject, V = any>(object: T, field: FieldType, value: V): V =>
  jp.value(object, '$.' + field.path, value);

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
export const mapSchemaToFields = (schema: Schema.Schema<any, any>): SchemaFieldDescription[] => {
  const fields = [] as SchemaFieldDescription[];
  visit(schema.ast, (node, path) => {
    const { type, format } = toFieldValueType(node);
    fields.push({ property: path.join('.'), type, format });
  });

  return fields;
};

const toFieldValueType = (type: SchemaAST.AST): { format?: FormatEnum; type: TypeEnum } => {
  if (SchemaAST.isTypeLiteral(type)) {
    return { type: TypeEnum.Ref, format: FormatEnum.Ref };
  } else if (SchemaAST.isNumberKeyword(type)) {
    return { type: TypeEnum.Number };
  } else if (SchemaAST.isBooleanKeyword(type)) {
    return { type: TypeEnum.Boolean };
  } else if (SchemaAST.isStringKeyword(type)) {
    return { type: TypeEnum.String };
  }

  if (SchemaAST.isRefinement(type)) {
    return toFieldValueType(type.from);
  }

  // TODO(zan): How should we be thinking about transformations?
  //  See https://effect.website/docs/guides/schema/projections
  //  - Which of these are we storing in the database?
  //  - For types that aren't the 'DateFromString' transformation, should we be using the 'from' or 'to' type?
  if (SchemaAST.isTransformation(type)) {
    const identifier = SchemaAST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return { type: TypeEnum.String, format: FormatEnum.Date };
      }
    }
  }

  // TODO(burdon): Better fallback?
  return { type: TypeEnum.String, format: FormatEnum.JSON };
};

/**
 * Creates or updates echo annotations for SingleSelect options in a JSON Schema property.
 */
export const makeSingleSelectAnnotations = (
  jsonProperty: JsonSchemaType,
  options: Array<{ id: string; title?: string; color?: string }>,
) => {
  jsonProperty.enum = options.map(({ id }) => id);
  jsonProperty.format = FormatEnum.SingleSelect;
  jsonProperty.annotations = {
    meta: {
      singleSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};

/**
 * Creates or updates echo annotations for MultiSelect options in a JSON Schema property.
 */
export const makeMultiSelectAnnotations = (
  jsonProperty: JsonSchemaType,
  options: Array<{ id: string; title?: string; color?: string }>,
) => {
  // TODO(ZaymonFC): Is this how do we encode an array of enums?
  jsonProperty.type = 'object';
  jsonProperty.items = { type: 'string', enum: options.map(({ id }) => id) };
  jsonProperty.format = FormatEnum.MultiSelect;
  jsonProperty.annotations = {
    meta: {
      multiSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};
