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

export class SchemaValidator {
  public static prepareTarget<T>(target: T, schema: S.Schema<T>) {
    if (!isTypeLiteral(schema.ast)) {
      throw new Error('schema has to describe an object type');
    }
    const _ = S.asserts(schema)(target);
    this.makeArraysReactive(target);
    setSchemaProperties(target, schema);
  }

  private static makeArraysReactive(target: any) {
    for (const key in target) {
      if (Array.isArray(target[key])) {
        target[key] = ReactiveArray.from(target[key]);
      }
      if (typeof target[key] === 'object') {
        this.makeArraysReactive(target[key]);
      }
    }
  }

  public static validateValue(target: any, prop: string | symbol, value: any) {
    const schema = getTargetPropertySchema(target, prop);
    const _ = S.asserts(schema)(value);
    if (Array.isArray(value)) {
      value = new ReactiveArray(...value);
    }
    if (isValidProxyTarget(value)) {
      setSchemaProperties(value, schema);
    }
    return value;
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

/**
 * tuple AST is used both for:
 * fixed-length tuples ([string, number]) in which case AST will be { elements: [S.string, S.number] }
 * variable-length arrays (Array<string | number>) in which case AST will be { rest: [S.union(S.string, S.number)] }
 */
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

const getProperties = (typeAst: AST.AST, target: any): AST.PropertySignature[] => {
  const astCandidates = AST.isUnion(typeAst) ? typeAst.types : [typeAst];
  const typeAstList = astCandidates.filter((type) => AST.isTypeLiteral(type));
  invariant(typeAstList.length > 0, `target can't have properties since it's not a type: ${typeAst._tag}`);
  if (typeAstList.length === 1) {
    return AST.getPropertySignatures(typeAstList[0]);
  }
  const discriminatorProperties = typeAstList.flatMap(AST.getPropertySignatures).filter((p) => AST.isLiteral(p.type));
  const propertyName = discriminatorProperties[0].name;
  const isValidDiscriminator = discriminatorProperties.every((p) => p.name === propertyName && !p.isOptional);
  const everyTypeHasDiscriminator = discriminatorProperties.length === typeAstList.length;
  const isDiscriminatedUnion = isValidDiscriminator && everyTypeHasDiscriminator;
  invariant(isDiscriminatedUnion, 'type ambiguity: every type in a union must have a single unique-literal field');
  const typeIndex = discriminatorProperties.findIndex((p) => target[p.name] === (p.type as AST.Literal).literal);
  invariant(typeIndex !== -1, 'discriminator field not set on target');
  return AST.getPropertySignatures(typeAstList[typeIndex]);
};

const getTargetPropertySchema = (target: any, prop: string | symbol): S.Schema<any> => {
  const schema = (target as any)[symbolSchema];
  invariant(schema, 'target has no schema');
  if (target instanceof ReactiveArray) {
    return getArrayElementSchema(schema, prop);
  }
  const properties = getProperties(schema.ast as AST.AST, target).find((property) => property.name === prop);
  if (!properties) {
    throw new Error(`Invalid property: ${prop.toString()}`);
  }
  return S.make(properties.type);
};

/**
 * Recursively set AST on all potential proxy targets.
 */
export const setSchemaProperties = (obj: any, schema: S.Schema<any>) => {
  defineHiddenProperty(obj, symbolSchema, schema);
  for (const key in obj) {
    if (isValidProxyTarget(obj[key])) {
      const elementSchema = getTargetPropertySchema(obj, key);
      setSchemaProperties(obj[key], elementSchema);
    }
  }
};
