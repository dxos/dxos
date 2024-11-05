//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { FormatEnum, type JsonPath } from '@dxos/echo-schema';
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
      return property as JsonPath;
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
export const mapSchemaToFields = (schema: S.Schema<any, any>): [string, FormatEnum][] => {
  const fields: [string, FormatEnum][] = [];
  visit(schema.ast, (node, path) => {
    if (isLeafType(node)) {
      fields.push([path.join('.'), toFieldValueType(node)]);
    }
  });

  return fields;
};

/**
 * @deprecated
 */
export const toFieldValueType = (type: AST.AST): FormatEnum => {
  if (AST.isTypeLiteral(type)) {
    // TODO(burdon): ???
    return FormatEnum.Ref;
  } else if (AST.isNumberKeyword(type)) {
    return FormatEnum.Number;
  } else if (AST.isBooleanKeyword(type)) {
    return FormatEnum.Boolean;
  } else if (AST.isStringKeyword(type)) {
    return FormatEnum.String;
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
        return FormatEnum.Date;
      }
    }
  }

  // TODO(burdon): Better fallback?
  return FormatEnum.JSON;
};
