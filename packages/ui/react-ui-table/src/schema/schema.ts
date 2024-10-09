//
// Copyright 2024 DXOS.org
//

import { AST, type S } from '@dxos/effect';

import { type ColumnType } from './types';

// TODO(burdon): Factor out to @dxos/effect?

// TODO(burdon): Rename?
export const classifySchemaProperties = (schema: S.Schema<any, any>): [string, ColumnType][] => {
  const recurse = (node: AST.AST, path: string[], acc: [string, ColumnType][]) => {
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

const isStruct = (node: AST.AST) => AST.isTypeLiteral(node);

const isOptionalUnion = (prop: AST.PropertySignature) => AST.isUnion(prop.type) && prop.isOptional;

const unwrapOptionProperty = (prop: AST.PropertySignature) => {
  if (!isOptionalUnion(prop)) {
    throw new Error(`Not an optional property: ${String(prop.name)}`);
  }

  if (!AST.isUnion(prop.type)) {
    throw new Error(`Not a union type: ${String(prop.name)}`);
  }

  const [type] = prop.type.types;
  return type;
};

const typeToColumn = (type: AST.AST): ColumnType => {
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

  if (AST.isTransformation(type)) {
    const identifier = AST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return 'date';
      }
    }
  }

  return 'json';
};

const propertyToColumn = (prop: AST.PropertySignature): ColumnType => {
  let type = prop.type;
  if (prop.isOptional) {
    type = unwrapOptionProperty(prop);
  }

  return typeToColumn(type);
};
