//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import { isTypeLiteral } from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import * as Option from 'effect/Option';

import { invariant } from '@dxos/invariant';

import { isValidProxyTarget } from './proxy';
import { ReactiveArray } from './reactive-array';
import { defineHiddenProperty } from '../util/property';

export const symbolSchema = Symbol.for('@dxos/schema');
export const symbolTypeAst = Symbol.for('@dxos/type/AST');

export class SchemaValidator {
  public static prepareTarget<T>(target: T, schema: S.Schema<T>) {
    if (!isTypeLiteral(schema.ast)) {
      throw new Error('schema has to describe an object type');
    }
    const _ = S.asserts(schema)(target);
    setSchemaProperties(target, schema);
  }

  public static initTypedTarget(target: any) {
    invariant(target[symbolSchema]);
    this.makeArraysReactive(target);
  }

  private static makeArraysReactive(target: any) {
    for (const key in target) {
      if (Array.isArray(target[key]) && !(target[key] instanceof ReactiveArray)) {
        target[key] = ReactiveArray.from(target[key]);
        const schema = this._getTargetPropertySchema(target, key);
        setSchemaProperties(target[key], schema);
      }
    }
  }

  public static validateValue(target: any, prop: string | symbol, value: any) {
    const schema = this._getTargetPropertySchema(target, prop);
    const _ = S.asserts(schema)(value);
    if (Array.isArray(value)) {
      value = new ReactiveArray(...value);
    }
    if (isValidProxyTarget(value)) {
      setSchemaProperties(value, schema);
    }
    return value;
  }

  private static _getTargetPropertySchema(target: any, prop: string | symbol): S.Schema<any> {
    if (target instanceof ReactiveArray) {
      const schema = (target as any)[symbolSchema];
      invariant(schema, 'target has no schema');
      return getArrayElementSchema(schema, prop);
    }
    const ast = target[symbolTypeAst] as AST.AST;
    invariant(ast, 'target has no schema AST');
    const properties = AST.getPropertySignatures(ast).find((property) => property.name === prop);
    if (!properties) {
      throw new Error(`Invalid property: ${prop.toString()}`);
    }
    return S.make(properties.type);
  }

  public static getPropertySchema(
    rootObjectSchema: S.Schema<any>,
    propertyPath: Array<string | symbol>,
  ): S.Schema<any> {
    let schema: S.Schema<any> = rootObjectSchema;
    for (const propertyName of propertyPath) {
      if (AST.isTuple(schema.ast)) {
        schema = getArrayElementSchema(schema, propertyName);
      } else {
        const property = AST.getPropertySignatures(schema.ast).find((p) => p.name === propertyName);
        invariant(property, `unknown property: ${String(propertyName)}, path: ${propertyPath}`);
        schema = S.make(property.type);
      }
    }
    return schema;
  }
}

const getArrayElementSchema = (arraySchema: S.Schema<any>, property: string | symbol): S.Schema<any> => {
  const elementIndex = typeof property === 'string' ? parseInt(property, 10) : Number.NaN;
  if (Number.isNaN(elementIndex)) {
    invariant(property === 'length', `invalid array property: ${String(property)}`);
    return S.number;
  }
  let arrayAst = AST.isTuple(arraySchema.ast) ? arraySchema.ast : null;
  if (AST.isUnion(arraySchema.ast)) {
    arrayAst = arraySchema.ast.types.find((ast) => AST.isTuple(ast)) as AST.Tuple;
  }
  invariant(arrayAst, 'not an array');
  if (elementIndex < arrayAst.elements.length) {
    return S.make(arrayAst.elements[elementIndex].type);
  }
  const restType = Option.getOrNull(arrayAst.rest);
  invariant(restType, 'element index out of bounds');
  return S.make(restType[0]);
};

/**
 * Recursively set AST property on the object.
 */
// TODO(burdon): Use visitProperties.
export const setSchemaProperties = (obj: any, schema: S.Schema<any>) => {
  if (!obj[symbolSchema]) {
    defineHiddenProperty(obj, symbolSchema, schema);
  }

  const unwrapped = unwrapOptionality(schema.ast);

  if (AST.isTypeLiteral(unwrapped)) {
    Object.defineProperty(obj, symbolTypeAst, {
      enumerable: false,
      configurable: true,
      value: unwrapped,
    });

    for (const property of unwrapped.propertySignatures) {
      const value = (obj as any)[property.name];
      if (isValidProxyTarget(value)) {
        setSchemaProperties(value, S.make(unwrapOptionality(property.type)));
      }
    }
  } else if (Array.isArray(obj) && AST.isTuple(unwrapped)) {
    for (const key in obj) {
      if (isValidProxyTarget(obj[key])) {
        const elementSchema = getArrayElementSchema(schema, key);
        setSchemaProperties(obj[key], elementSchema);
      }
    }
  } else {
    // log.warn('unable to set schema properties', { obj, ast: schema });
    // TODO(dmaretskyi): Throw an error?
  }
};

/**
 * Handles unions with undefined and returns the AST for the other union member.
 */
const unwrapOptionality = (ast: AST.AST): AST.AST => {
  if (AST.isUnion(ast) && ast.types.length === 2) {
    const undefinedIdx = ast.types.findIndex((type) => AST.isUndefinedKeyword(type));
    if (undefinedIdx === 0) {
      return ast.types[1];
    } else if (undefinedIdx === 1) {
      return ast.types[0];
    } else {
      return ast;
    }
  }

  return ast;
};
