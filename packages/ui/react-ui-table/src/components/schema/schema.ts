//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import type * as S from '@effect/schema/Schema';

import { type ColumnType } from '../../schema';

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

const typeToColumn = (type: AST.AST): ColumnType | 'display' => {
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

  // How should we be thinking about transformatinos?
  // - Should the table present the data as the 'from' type or the 'to' type?
  // - Which of these are we storing in the database?

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

const propertyToColumn = (property: AST.PropertySignature): ColumnType | 'display' => {
  let type = property.type;

  if (property.isOptional) {
    type = unwrapOptionProperty(property);
  }

  return typeToColumn(type);
};

export const classifySchemaProperties = (schema: S.Schema<any, any>) => {
  const properties = AST.getPropertySignatures(schema.ast);
  return properties.map((p) => [p.name, propertyToColumn(p)] as const);
};
