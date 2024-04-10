//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import type * as S from '@effect/schema/Schema';

import { type ColumnType } from '../schema';

export type ClassifiedColumnType = ColumnType | 'display';

const isOptionalUnion = (prop: AST.PropertySignature) => AST.isUnion(prop.type) && prop.isOptional;

const unwrapOptionProperty = (prop: AST.PropertySignature) => {
  if (!isOptionalUnion(prop)) {
    throw new Error('Not an optional property');
  }

  if (!AST.isUnion(prop.type)) {
    throw new Error('Not a union type');
  }

  const [type, _undefinedCase] = prop.type.types;

  return type;
};

const typeToColumn = (type: AST.AST): ClassifiedColumnType => {
  if (AST.isStringKeyword(type)) {
    return 'string';
  } else if (AST.isNumberKeyword(type)) {
    return 'number';
  } else if (AST.isBooleanKeyword(type)) {
    return 'boolean';
  }

  if (AST.isRefinement(type)) {
    return typeToColumn(type.from);
  }

  // TODO(zan): How should we be thinking about transformations?
  // - Which of these are we storing in the database?
  // - For types that aren't the 'DateFromString' transformation, should we be using the 'from' or 'to' type?

  if (AST.isTransform(type)) {
    const identifier = AST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return 'date';
      }
    }
  }

  return 'display';
};

const propertyToColumn = (property: AST.PropertySignature): ClassifiedColumnType => {
  let type = property.type;

  if (property.isOptional) {
    type = unwrapOptionProperty(property);
  }

  return typeToColumn(type);
};

const isStruct = (node: AST.AST) => AST.isTypeLiteral(node);

export const classifySchemaProperties = (schema: S.Schema<any, any>) => {
  const recurse = (node: AST.AST, path: string[], acc: [string, ClassifiedColumnType][]) => {
    const properties = AST.getPropertySignatures(node);
    properties.forEach((prop) => {
      const propName = prop.name.toString();

      if (prop.isOptional) {
        const unwrappedAst = unwrapOptionProperty(prop);
        if (isStruct(unwrappedAst)) {
          return recurse(unwrappedAst, [...path, propName], acc);
        }
      }

      if (isStruct(prop.type)) {
        recurse(prop.type, [...path, propName], acc);
      } else {
        acc.push([path.concat(propName).join('.'), propertyToColumn(prop)]);
      }
    });

    return acc;
  };

  return recurse(schema.ast, [], []);
};
