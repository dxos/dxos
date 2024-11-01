//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { type JsonPath } from '@dxos/echo-schema';
import { AST, type S, isLeafType, visit } from '@dxos/effect';

import { FieldKindEnum } from './annotations';
import { type FieldType, type ViewType } from './view';

export const getFieldValue = <T extends {} = {}, V = any>(
  object: T,
  field: FieldType,
  defaultValue?: V,
): V | undefined => (jp.value(object, '$.' + field.path) as V) ?? defaultValue;

// TODO(burdon): Determine if path can be written back (or is a compute value).
export const setFieldValue = <T extends {} = {}, V = any>(object: T, field: FieldType, value: V): V =>
  jp.value(object, '$.' + field.path, value);

/**
 * @deprecated
 */
export const mapSchemaToFields = (schema: S.Schema<any, any>): [string, FieldKindEnum][] => {
  const fields: [string, FieldKindEnum][] = [];
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
export const toFieldValueType = (type: AST.AST): FieldKindEnum => {
  if (AST.isTypeLiteral(type)) {
    // TODO(burdon): ???
    return FieldKindEnum.Ref;
  } else if (AST.isNumberKeyword(type)) {
    return FieldKindEnum.Number;
  } else if (AST.isBooleanKeyword(type)) {
    return FieldKindEnum.Boolean;
  } else if (AST.isStringKeyword(type)) {
    return FieldKindEnum.String;
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
        return FieldKindEnum.Date;
      }
    }
  }

  // TODO(burdon): Better fallback?
  return FieldKindEnum.JSON;
};

// TODO(burdon): Check unique name against schema.
export const getUniqueProperty = (view: ViewType): JsonPath => {
  let n = 1;
  while (true) {
    const path = `prop_${n++}`;
    const idx = view.fields.findIndex((field) => field.path === path);
    if (idx === -1) {
      return path as JsonPath;
    }
  }
};

export const createUniqueFieldForView = (view: ViewType): FieldType => {
  return { path: getUniqueProperty(view) };
};
