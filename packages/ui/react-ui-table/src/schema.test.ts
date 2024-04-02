// TODO: ZAN Remove these eslint rule overrides.
/* eslint-disable prettier/prettier */
/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable unused-imports/no-unused-imports */

//
// Copyright 2024 DXOS.org
//

import { AST, ParseResult } from '@effect/schema';
import * as JSONSchema from '@effect/schema/JSONSchema';
import * as Pretty from '@effect/schema/Pretty';
import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { test, describe } from '@dxos/test';

import { type ColumnProps, type ColumnType } from './schema';

export type PropertyVisitor<T> = (property: AST.PropertySignature, path: PropertyKey[]) => T;

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

// TODO(zan): Remove this utility
const failwith = (...data: any) => {
  // if data is an array, we want to log each element separately
  // intelligently stringify antyhing that isn't a string
  const message = data.map((d: any) => (typeof d === 'string' ? d : JSON.stringify(d, null, 2))).join('\n');

  throw new Error(message);
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

// Iterate through the AST, collecting all column definitions.
// - Let's just try and handle top level properties for now.
const schemaToColumns = (schema: S.Schema<any, any>) => {
  const properties = AST.getPropertySignatures(schema.ast);

  return properties.map((p) => [p.name, propertyToColumn(p)]);
};

describe('schema->column-type', () => {
  test('basic', () => {
    const simpleSchema = S.struct({
      field1: S.string,
      field2: S.number,
    });

    const columns = schemaToColumns(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('optional properties', () => {
    const simpleSchema = S.struct({
      field1: S.optional(S.string),
      field2: S.optional(S.number),
    });

    const columns = schemaToColumns(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('dates', () => {
    const simpleSchema = S.struct({
      field1: S.Date,
      field2: S.optional(S.Date),
    });

    const columns = schemaToColumns(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'date'],
      ['field2', 'date'],
    ]);
  });

  test('Piped validators', () => {
    const simpleSchema = S.struct({
      name: S.optional(S.string.pipe(S.nonEmpty(), S.maxLength(10))),
      age: S.number.pipe(S.negative()),
    });

    const columns = schemaToColumns(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['age', 'number'],
    ]);
  });
});
