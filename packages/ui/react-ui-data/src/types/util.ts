//
// Copyright 2024 DXOS.org
//

import { AST, type S } from '@dxos/echo-schema';

import { FieldValueType } from './types';

// TODO(burdon): Return Field objects.
export const toFieldValueType = (schema: S.Schema<any, any>): [string, FieldValueType][] => {
  const visitNode = (node: AST.AST, path: string[] = [], acc: [string, FieldValueType][] = []) => {
    const props = AST.getPropertySignatures(node);
    props.forEach((prop) => {
      const propName = prop.name.toString();
      if (prop.isOptional) {
        const unwrappedAst = unwrapOptionProperty(prop);
        if (isStruct(unwrappedAst)) {
          return visitNode(unwrappedAst, [...path, propName], acc);
        }
      }

      if (isStruct(prop.type)) {
        visitNode(prop.type, [...path, propName], acc);
      } else {
        acc.push([path.concat(propName).join('.'), propertyToColumn(prop)]);
      }
    });

    return acc;
  };

  return visitNode(schema.ast);
};

const isStruct = (node: AST.AST) => AST.isTypeLiteral(node);

const propertyToColumn = (prop: AST.PropertySignature): FieldValueType => {
  let type = prop.type;
  if (prop.isOptional) {
    type = unwrapOptionProperty(prop);
  }

  return typeToColumn(type);
};

const unwrapOptionProperty = (prop: AST.PropertySignature) => {
  if (!AST.isUnion(prop.type)) {
    throw new Error(`Not a union type: ${String(prop.name)}`);
  }

  const [type] = prop.type.types;
  return type;
};

const typeToColumn = (type: AST.AST): FieldValueType => {
  if (AST.isTypeLiteral(type)) {
    return FieldValueType.Ref;
  } else if (AST.isStringKeyword(type)) {
    return FieldValueType.String;
  } else if (AST.isNumberKeyword(type)) {
    return FieldValueType.Number;
  } else if (AST.isBooleanKeyword(type)) {
    return FieldValueType.Boolean;
  }

  if (AST.isRefinement(type)) {
    return typeToColumn(type.from);
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
