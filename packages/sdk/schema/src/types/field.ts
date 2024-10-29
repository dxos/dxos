//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { AST, S, isLeafType, visit } from '@dxos/effect';

import { EmailFormat, FormatAnnotationId, UrlFormat } from './annotations';
import { type FieldType, FieldValueType, type ViewType } from './types';

// TODO(burdon): Just use lodash.get?
export const getFieldValue = <T>(data: any, field: FieldType, defaultValue?: T): T | undefined =>
  (jp.value(data, '$.' + field.path) as T) ?? defaultValue;

// TODO(burdon): Determine if path can be written back (or is a compute value).
export const setFieldValue = <T>(data: any, field: FieldType, value: T): T => jp.value(data, '$.' + field.path, value);

// TODO(burdon): Return Field objects.
export const mapSchemaToFields = (schema: S.Schema<any, any>): [string, FieldValueType][] => {
  const fields: [string, FieldValueType][] = [];
  visit(schema.ast, (node, path) => {
    if (isLeafType(node)) {
      fields.push([path.join('.'), toFieldValueType(node)]);
    }
  });
  return fields;
};

// TODO(burdon): Reconcile with:
//  - echo-schema/toFieldValueType
export const toFieldValueType = (type: AST.AST): FieldValueType => {
  if (AST.isTypeLiteral(type)) {
    // TODO(burdon): ???
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
  //  See https://effect.website/docs/guides/schema/projections
  //  - Which of these are we storing in the database?
  //  - For types that aren't the 'DateFromString' transformation, should we be using the 'from' or 'to' type?
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

// TODO(ZaymonFC): Find all the appropriate annotations.
// TODO(ZaymonFC): Pipe S.Pattern (regex) for email, url, etc.
export const schemaForType: Record<FieldValueType, S.Schema<any> | undefined> = {
  [FieldValueType.String]: S.String,
  [FieldValueType.Text]: S.String,
  [FieldValueType.Number]: S.Number,
  [FieldValueType.Boolean]: S.Boolean,
  [FieldValueType.Date]: S.DateFromString,
  [FieldValueType.Email]: S.String.annotations({ [FormatAnnotationId]: EmailFormat }),
  [FieldValueType.URL]: S.String.annotations({ [FormatAnnotationId]: UrlFormat }),
  [FieldValueType.Percent]: S.Number,
  [FieldValueType.Currency]: S.Number,
  [FieldValueType.Ref]: undefined,
  [FieldValueType.User]: undefined,
  [FieldValueType.JSON]: undefined,
  [FieldValueType.Timestamp]: undefined,
  [FieldValueType.DateTime]: undefined,
  [FieldValueType.Time]: undefined,
  [FieldValueType.Formula]: undefined,
  [FieldValueType.DID]: undefined,
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
