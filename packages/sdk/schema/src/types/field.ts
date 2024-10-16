//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { AST, type S } from '@dxos/echo-schema';

import { type FieldType, FieldValueType, type ViewType } from './types';

// TODO(burdon): Just use lodash.get?
export const getFieldValue = <T>(data: any, field: FieldType, defaultValue?: T): T | undefined =>
  (jp.value(data, '$.' + field.path) as T) ?? defaultValue;

// TODO(burdon): Determine if path can be written back (or is a compute value).
export const setFieldValue = <T>(data: any, field: FieldType, value: T): T => jp.value(data, '$.' + field.path, value);

// TODO(burdon): Return Field objects.
export const mapSchemaToFields = (schema: S.Schema<any, any>): [string, FieldValueType][] => {
  const visitNode = (node: AST.AST, path: string[] = [], acc: [string, FieldValueType][] = []) => {
    const props = AST.getPropertySignatures(node);
    props.forEach((prop) => {
      const propName = prop.name.toString();
      if (prop.isOptional) {
        const unwrappedAst = unwrapOptionProperty(prop);
        if (AST.isTypeLiteral(unwrappedAst)) {
          return visitNode(unwrappedAst, [...path, propName], acc);
        }
      }

      if (AST.isTypeLiteral(prop.type)) {
        visitNode(prop.type, [...path, propName], acc);
      } else {
        let type: AST.AST = prop.type;
        if (prop.isOptional) {
          type = unwrapOptionProperty(prop);
        }

        acc.push([path.concat(propName).join('.'), toFieldValueType(type)]);
      }
    });

    return acc;
  };

  return visitNode(schema.ast);
};

const unwrapOptionProperty = (prop: AST.PropertySignature): AST.AST => {
  if (!AST.isUnion(prop.type)) {
    throw new Error(`Not a union type: ${String(prop.name)}`);
  }

  // TODO(burdon): This is very likely a bug.
  const [type] = prop.type.types;
  return type;
};

// TODO(burdon): Reconcile with:
//  - echo-schema/toFieldValueType
const toFieldValueType = (type: AST.AST): FieldValueType => {
  if (AST.isTypeLiteral(type)) {
    return FieldValueType.Ref;
  } else if (AST.isNumberKeyword(type)) {
    return FieldValueType.Number;
  } else if (AST.isBooleanKeyword(type)) {
    return FieldValueType.Boolean;
  } else if (AST.isStringKeyword(type)) {
    return FieldValueType.String;
  }

  if (AST.isRefinement(type)) {
    return toFieldValueType(type.from);
  }

  // TODO(zan): How should we be thinking about transformations?
  // - Which of these are we storing in the database?
  // - For types that aren't the 'DateFromString' transformation, should we be using the 'from' or 'to' type?

  if (AST.isTransformation(type)) {
    const identifier = AST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return FieldValueType.Date;
      }
    }
  }

  // TODO(burdon): Better fallback?
  return FieldValueType.JSON;
};

// TODO(burdon): Check unique name against schema.
export const getUniqueProperty = (view: ViewType) => {
  let n = 1;
  while (true) {
    const path = `prop_${n++}`;
    const idx = view.fields.findIndex((field) => field.path === path);
    if (idx === -1) {
      return path;
    }
  }
};
