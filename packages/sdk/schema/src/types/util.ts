//
// Copyright 2024 DXOS.org
//

import { AST, type S, isLeafType, visit } from '@dxos/effect';

import { FieldKindEnum } from './annotations';

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
