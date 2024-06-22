//
// Copyright 2024 DXOS.org
//

import { AST } from '@dxos/echo-schema';
import type { S } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with react-ui-table.

export type ColumnType = 'number' | 'boolean' | 'date' | 'string' | 'ref';

export type ClassifiedColumnType = ColumnType | 'display';

// TODO(burdon): Rename getX? and return typed array?
export const classifySchemaProperties = (schema: S.Schema<any, any>): [string, ClassifiedColumnType][] => {
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

const isStruct = (node: AST.AST) => AST.isTypeLiteral(node);

const isOptionalUnion = (prop: AST.PropertySignature) => AST.isUnion(prop.type) && prop.isOptional;

const unwrapOptionProperty = (prop: AST.PropertySignature) => {
  if (!isOptionalUnion(prop)) {
    throw new Error(`Not an optional property: ${String(prop.name)}`);
  }

  if (!AST.isUnion(prop.type)) {
    throw new Error(`Not a union type: ${String(prop.name)}`);
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

  if (AST.isTransformation(type)) {
    const identifier = AST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return 'date';
      }
    }
  }

  return 'display';
};

const propertyToColumn = (prop: AST.PropertySignature): ClassifiedColumnType => {
  let type = prop.type;
  if (prop.isOptional) {
    type = unwrapOptionProperty(prop);
  }

  return typeToColumn(type);
};
