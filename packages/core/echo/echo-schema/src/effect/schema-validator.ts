//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import { isTypeLiteral } from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';

import { isValidProxyTarget } from './proxy';
import { ReactiveArray } from './reactive-array';
import { type KeyPath } from '../automerge/key-path';
import { defineHiddenProperty } from '../util/property';

export const symbolSchema = Symbol.for('@dxos/schema');

export class SchemaValidator {
  public static prepareTarget<T>(target: T, schema: S.Schema<T>) {
    if (!isTypeLiteral(schema.ast)) {
      throw new Error('schema has to describe an object type');
    }
    this.validateSchema(schema);
    const _ = S.asserts(schema)(target);
    this.makeArraysReactive(target);
    setSchemaProperties(target, schema);
  }

  /**
   * Recursively check that schema specifies constructions we can handle.
   * Validates there are no ambiguous discriminated union types.
   */
  public static validateSchema(schema: S.Schema<any>) {
    const visitAll = (astList: AST.AST[]) => astList.forEach((ast) => this.validateSchema(S.make(ast)));
    if (AST.isUnion(schema.ast)) {
      const typeAstList = schema.ast.types.filter((type) => isTypeLiteral(type)) as AST.TypeLiteral[];
      // check we can handle a discriminated union
      if (typeAstList.length > 1) {
        getTypeDiscriminators(typeAstList);
      }
      visitAll(typeAstList);
    } else if (AST.isTupleType(schema.ast)) {
      const positionalTypes = schema.ast.elements.map((e) => e.type);
      const allTypes = positionalTypes.concat(schema.ast.rest);
      visitAll(allTypes);
    } else if (AST.isTypeLiteral(schema.ast)) {
      visitAll(AST.getPropertySignatures(schema.ast).map((p) => p.type));
    }
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
    propertyPath: KeyPath,
    getPropertyFn: (path: KeyPath) => any,
  ): S.Schema<any> {
    let schema: S.Schema<any> = rootObjectSchema;
    for (let i = 0; i < propertyPath.length; i++) {
      const propertyName = propertyPath[i];
      const tupleAst = AST.isUnion(schema.ast) ? schema.ast.types.find((ast) => AST.isTupleType(ast)) : null;
      if (AST.isTupleType(tupleAst ?? schema.ast)) {
        schema = getArrayElementSchema(schema, propertyName);
      } else {
        const allProperties = getProperties(schema.ast, (propertyName) =>
          getPropertyFn([...propertyPath.slice(0, i), propertyName]),
        );
        const property = allProperties.find((p) => p.name === propertyName);
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
const getArrayElementSchema = (arraySchema: S.Schema<any>, property: string | symbol | number): S.Schema<any> => {
  const elementIndex = typeof property === 'string' ? parseInt(property, 10) : Number.NaN;
  if (Number.isNaN(elementIndex)) {
    invariant(property === 'length', `invalid array property: ${String(property)}`);
    return S.number;
  }
  let arrayAst = AST.isTupleType(arraySchema.ast) ? arraySchema.ast : null;
  if (AST.isUnion(arraySchema.ast)) {
    arrayAst = arraySchema.ast.types.find((ast) => AST.isTupleType(ast)) as AST.TupleType;
  }
  invariant(arrayAst, 'not an array');
  if (elementIndex < arrayAst.elements.length) {
    return S.make(arrayAst.elements[elementIndex].type);
  }
  const restType = arrayAst.rest;
  return S.make(restType[0]);
};

const flattenUnion = (typeAst: AST.AST): AST.AST[] =>
  AST.isUnion(typeAst) ? typeAst.types.flatMap(flattenUnion) : [typeAst];

const getProperties = (
  typeAst: AST.AST,
  getTargetPropertyFn: (propertyName: string) => any,
): AST.PropertySignature[] => {
  const astCandidates = flattenUnion(typeAst);
  const typeAstList = astCandidates.filter((type) => AST.isTypeLiteral(type)) as AST.TypeLiteral[];
  invariant(typeAstList.length > 0, `target can't have properties since it's not a type: ${typeAst._tag}`);
  if (typeAstList.length === 1) {
    return AST.getPropertySignatures(typeAstList[0]);
  }
  const typeDiscriminators = getTypeDiscriminators(typeAstList);
  const targetPropertyValue = getTargetPropertyFn(String(typeDiscriminators[0].name));
  const typeIndex = typeDiscriminators.findIndex((p) => targetPropertyValue === (p.type as AST.Literal).literal);
  invariant(typeIndex !== -1, 'discriminator field not set on target');
  return AST.getPropertySignatures(typeAstList[typeIndex]);
};

const getTypeDiscriminators = (typeAstList: AST.TypeLiteral[]): AST.PropertySignature[] => {
  const discriminatorPropCandidates = typeAstList
    .flatMap(AST.getPropertySignatures)
    .filter((p) => AST.isLiteral(p.type));
  const propertyName = discriminatorPropCandidates[0].name;
  const isValidDiscriminator = discriminatorPropCandidates.every((p) => p.name === propertyName && !p.isOptional);
  const everyTypeHasDiscriminator = discriminatorPropCandidates.length === typeAstList.length;
  const isDiscriminatedUnion = isValidDiscriminator && everyTypeHasDiscriminator;
  invariant(isDiscriminatedUnion, 'type ambiguity: every type in a union must have a single unique-literal field');
  return discriminatorPropCandidates;
};

const getTargetPropertySchema = (target: any, prop: string | symbol): S.Schema<any> => {
  const schema = (target as any)[symbolSchema];
  invariant(schema, 'target has no schema');
  if (target instanceof ReactiveArray) {
    return getArrayElementSchema(schema, prop);
  }
  const properties = getProperties(schema.ast as AST.AST, (prop) => target[prop]).find(
    (property) => property.name === prop,
  );
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

export const validateIdNotPresentOnSchema = (schema: S.Schema<any, any, any>) => {
  invariant(isTypeLiteral(schema.ast));
  const idProperty = AST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'id');
  if (idProperty != null) {
    throw new Error('"id" property name is reserved');
  }
};
