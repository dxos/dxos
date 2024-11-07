//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { createJsonPath, FormatEnum, ScalarEnum, type JsonPath } from '@dxos/echo-schema';
import { AST, type S, isLeafType, visit } from '@dxos/effect';

import { type FieldType, type ViewType } from './view';

// TODO(burdon): Check unique name against schema.
// TODO(dmaretskyi): Not json-path anymore.
export const getUniqueProperty = (view: ViewType): JsonPath => {
  let n = 1;
  while (true) {
    const property = `prop_${n++}`;
    const idx = view.fields.findIndex((field) => field.property === property);
    if (idx === -1) {
      return createJsonPath(property);
    }
  }
};

export const createUniqueFieldForView = (view: ViewType): FieldType => {
  return { property: getUniqueProperty(view) };
};

//
// TODO(burdon): REMOVE: All deprecated (old react-ui-table).
//

/**
 * @deprecated
 */
export const getFieldValue = <T extends {} = {}, V = any>(
  object: T,
  field: FieldType,
  defaultValue?: V,
): V | undefined => (jp.value(object, '$.' + field.property) as V) ?? defaultValue;

/**
 * @deprecated
 */
export const setFieldValue = <T extends {} = {}, V = any>(object: T, field: FieldType, value: V): V =>
  jp.value(object, '$.' + field.property, value);

/**
 * @deprecated
 */
export type SchemaFieldDescription = {
  property: string;
  type: ScalarEnum;
  format?: FormatEnum;
};

/**
 * @deprecated
 */
export const mapSchemaToFields = (schema: S.Schema<any, any>): SchemaFieldDescription[] => {
  const fields = [] as SchemaFieldDescription[];
  visit(schema.ast, (node, path) => {
    if (isLeafType(node)) {
      const { type, format } = toFieldValueType(node);
      fields.push({ property: path.join('.'), type, format });
    }
  });

  return fields;
};

const toFieldValueType = (type: AST.AST): { format?: FormatEnum; type: ScalarEnum } => {
  if (AST.isTypeLiteral(type)) {
    // TODO(burdon): ???
    return { type: ScalarEnum.Ref, format: FormatEnum.Ref };
  } else if (AST.isNumberKeyword(type)) {
    return { type: ScalarEnum.Number };
  } else if (AST.isBooleanKeyword(type)) {
    return { type: ScalarEnum.Boolean };
  } else if (AST.isStringKeyword(type)) {
    return { type: ScalarEnum.String };
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
        return { type: ScalarEnum.String, format: FormatEnum.Date };
      }
    }
  }

  // TODO(burdon): Better fallback?
  return { type: ScalarEnum.String, format: FormatEnum.JSON };
};
