//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';

import { SchemaId } from '../types';

// TODO(burdon): Reconcile with @dxos/effect visit().

export class SchemaValidator {
  /**
   * Recursively check that schema specifies constructions we can handle.
   * Validates there are no ambiguous discriminated union types.
   */
  public static validateSchema(schema: Schema.Schema.AnyNoContext): void {
    const visitAll = (nodes: SchemaAST.AST[]) => nodes.forEach((node) => this.validateSchema(Schema.make(node)));
    if (SchemaAST.isUnion(schema.ast)) {
      const typeAstList = schema.ast.types.filter((type) => SchemaAST.isTypeLiteral(type)) as SchemaAST.TypeLiteral[];
      // Check we can handle a discriminated union.
      if (typeAstList.length > 1) {
        getTypeDiscriminators(typeAstList);
      }
      visitAll(typeAstList);
    } else if (SchemaAST.isTupleType(schema.ast)) {
      const positionalTypes = schema.ast.elements.map((t) => t.type);
      const allTypes = positionalTypes.concat(schema.ast.rest.map((t) => t.type));
      visitAll(allTypes);
    } else if (SchemaAST.isTypeLiteral(schema.ast)) {
      visitAll(SchemaAST.getPropertySignatures(schema.ast).map((p) => p.type));
    }
  }

  public static hasTypeAnnotation(
    rootObjectSchema: Schema.Schema.AnyNoContext,
    property: string,
    annotation: symbol,
  ): boolean {
    try {
      let type = this.getPropertySchema(rootObjectSchema, [property]);
      if (SchemaAST.isTupleType(type.ast)) {
        type = this.getPropertySchema(rootObjectSchema, [property, '0']);
      }

      return type.ast.annotations[annotation] != null;
    } catch {
      return false;
    }
  }

  public static getPropertySchema(
    rootObjectSchema: Schema.Schema.AnyNoContext,
    propertyPath: KeyPath,
    getProperty: (path: KeyPath) => any = () => null,
  ): Schema.Schema.AnyNoContext {
    let schema: Schema.Schema.AnyNoContext = rootObjectSchema;
    for (let i = 0; i < propertyPath.length; i++) {
      const propertyName = propertyPath[i];
      const tupleAst = unwrapArray(schema.ast);
      if (tupleAst != null) {
        schema = getArrayElementSchema(tupleAst, propertyName);
      } else {
        const propertyType = getPropertyType(schema.ast, propertyName.toString(), (propertyName) =>
          getProperty([...propertyPath.slice(0, i), propertyName]),
        );
        if (propertyType == null) {
          const indexSignatureType = getIndexSignatureValueType(schema.ast);
          if (indexSignatureType != null) {
            schema = Schema.make(indexSignatureType).annotations(indexSignatureType.annotations);
            continue;
          }

          throw new TypeError(`Unknown property: ${formatPropertyPath([...propertyPath.slice(0, i), propertyName])}`);
        }

        schema = Schema.make(propertyType).annotations(propertyType.annotations);
      }
    }

    return schema;
  }

  /**
   * Rejects properties not declared on the schema. Types with index signatures allow extra keys.
   */
  public static assertExactProperties(
    schema: Schema.Schema.AnyNoContext,
    value: unknown,
    getProperty: (path: KeyPath) => unknown = () => undefined,
    path: KeyPath = [],
  ): void {
    if (!isPlainRecord(value)) {
      return;
    }

    const typeLiteral = resolveTypeLiteral(schema.ast, (propertyName) => getProperty([...path, propertyName]));
    if (typeLiteral == null) {
      return;
    }

    const propertySignatures = SchemaAST.getPropertySignatures(typeLiteral);
    const allowedKeys = new Set(propertySignatures.map((property) => String(property.name)));
    const indexSignatureType = typeLiteral.indexSignatures[0]?.type;

    for (const key of Object.keys(value)) {
      const propertyPath = [...path, key];
      if (!allowedKeys.has(key)) {
        if (indexSignatureType == null) {
          throw new TypeError(`Unknown property: ${formatPropertyPath(propertyPath)}`);
        }

        const indexSchema = Schema.make(indexSignatureType).annotations(indexSignatureType.annotations);
        this.assertExactProperties(indexSchema, value[key], getProperty, propertyPath);
        continue;
      }

      const propertySignature = propertySignatures.find((property) => String(property.name) === key);
      invariant(propertySignature, 'Property signature must exist.');
      const propertySchema = Schema.make(propertySignature.type).annotations(propertySignature.type.annotations);
      this.assertExactProperties(propertySchema, value[key], getProperty, propertyPath);
    }
  }

  public static getIndexedElementSchema(
    schema: Schema.Schema.AnyNoContext,
    index: number | string,
  ): Schema.Schema.AnyNoContext | null {
    const arrayAst = unwrapArray(schema.ast);
    if (arrayAst != null) {
      return getArrayElementSchema(arrayAst, index);
    }

    const unionAst = unwrapAst(
      schema.ast,
      (candidate) => SchemaAST.isUnion(candidate) && candidate.types.some((member) => unwrapArray(member) != null),
    );
    if (unionAst != null && SchemaAST.isUnion(unionAst)) {
      for (const member of unionAst.types) {
        const memberArrayAst = unwrapArray(member);
        if (memberArrayAst != null) {
          return getArrayElementSchema(memberArrayAst, index);
        }
      }
    }

    return null;
  }

  public static getTargetPropertySchema(target: any, prop: string | symbol): Schema.Schema.AnyNoContext {
    const schema: Schema.Schema.AnyNoContext | undefined = (target as any)[SchemaId];
    invariant(schema, 'target has no schema');

    if (Array.isArray(target)) {
      if (prop === 'length') {
        return Schema.Number;
      }

      const indexedSchema = this.getIndexedElementSchema(schema, prop);
      if (indexedSchema != null) {
        return indexedSchema;
      }

      // Arrays sometimes carry the element struct as their stamped schema.
      if (SchemaAST.isTypeLiteral(schema.ast)) {
        return schema;
      }
    }

    if (typeof prop === 'number' || (typeof prop === 'string' && /^\d+$/.test(prop))) {
      const indexedSchema = this.getIndexedElementSchema(schema, prop);
      if (indexedSchema != null) {
        return indexedSchema;
      }
    }

    const arrayAst = unwrapArray(schema.ast);
    if (arrayAst != null) {
      return getArrayElementSchema(arrayAst, prop);
    }

    const propertyType = getPropertyType(schema.ast, prop.toString(), (prop) => target[prop]);
    if (propertyType == null) {
      const indexSignatureType = getIndexSignatureValueType(schema.ast);
      if (indexSignatureType != null) {
        return Schema.make(indexSignatureType).annotations(indexSignatureType.annotations);
      }

      throw new TypeError(`Unknown property: ${String(prop)}`);
    }

    return Schema.make(propertyType).annotations(propertyType.annotations);
  }
}

/**
 * Tuple AST is used both for:
 * fixed-length tuples ([string, number]) in which case AST will be { elements: [Schema.String, Schema.Number] }
 * variable-length arrays (Array<string | number>) in which case AST will be { rest: [Schema.Union(Schema.String, Schema.Number)] }
 */
const getArrayElementSchema = (
  tupleAst: SchemaAST.TupleType,
  property: string | symbol | number,
): Schema.Schema.AnyNoContext => {
  const elementIndex =
    typeof property === 'number'
      ? property
      : typeof property === 'string'
        ? parseInt(property, 10)
        : Number.NaN;
  if (Number.isNaN(elementIndex)) {
    invariant(property === 'length', `invalid array property: ${String(property)}`);
    return Schema.Number;
  }
  if (elementIndex < tupleAst.elements.length) {
    const elementType = tupleAst.elements[elementIndex].type;
    return Schema.make(elementType).annotations(elementType.annotations);
  }

  const restType = tupleAst.rest;
  return Schema.make(restType[0].type).annotations(restType[0].annotations);
};

const flattenUnion = (typeAst: SchemaAST.AST): SchemaAST.AST[] =>
  SchemaAST.isUnion(typeAst) ? typeAst.types.flatMap(flattenUnion) : [typeAst];

const getProperties = (
  typeAst: SchemaAST.AST,
  getTargetPropertyFn: (propertyName: string) => any,
): SchemaAST.PropertySignature[] => {
  const astCandidates = flattenUnion(typeAst);
  const typeAstList = astCandidates.filter((type) => SchemaAST.isTypeLiteral(type)) as SchemaAST.TypeLiteral[];
  if (typeAstList.length === 0) {
    return [];
  }
  if (typeAstList.length === 1) {
    return SchemaAST.getPropertySignatures(typeAstList[0]);
  }

  const typeDiscriminators = getTypeDiscriminators(typeAstList);
  const targetPropertyValue = getTargetPropertyFn(String(typeDiscriminators[0].name));
  const typeIndex = typeDiscriminators.findIndex((p) => targetPropertyValue === (p.type as SchemaAST.Literal).literal);
  invariant(typeIndex !== -1, 'discriminator field not set on target');
  return SchemaAST.getPropertySignatures(typeAstList[typeIndex]);
};

const getPropertyType = (
  ast: SchemaAST.AST,
  propertyName: string,
  getTargetPropertyFn: (propertyName: string) => any,
): SchemaAST.AST | null => {
  const anyOrObject = unwrapAst(
    ast,
    (candidate) =>
      SchemaAST.isAnyKeyword(candidate) ||
      SchemaAST.isUnknownKeyword(candidate) ||
      SchemaAST.isObjectKeyword(candidate),
  );
  if (anyOrObject != null) {
    return ast;
  }

  const typeOrDiscriminatedUnion = unwrapAst(ast, (t) => {
    return SchemaAST.isTypeLiteral(t) || (SchemaAST.isUnion(t) && t.types.some((t) => SchemaAST.isTypeLiteral(t)));
  });
  if (typeOrDiscriminatedUnion == null) {
    return null;
  }

  const targetProperty = getProperties(typeOrDiscriminatedUnion, getTargetPropertyFn).find(
    (p) => p.name === propertyName,
  );
  if (targetProperty != null) {
    return unwrapAst(targetProperty.type);
  }

  const indexSignatureType = unwrapAst(ast, SchemaAST.isTypeLiteral);
  if (
    indexSignatureType &&
    SchemaAST.isTypeLiteral(indexSignatureType) &&
    indexSignatureType.indexSignatures.length > 0
  ) {
    return unwrapAst(indexSignatureType.indexSignatures[0].type);
  }

  return null;
};

const getTypeDiscriminators = (typeAstList: SchemaAST.TypeLiteral[]): SchemaAST.PropertySignature[] => {
  const discriminatorPropCandidates = typeAstList
    .flatMap(SchemaAST.getPropertySignatures)
    .filter((p) => SchemaAST.isLiteral(p.type));
  const propertyName = discriminatorPropCandidates[0].name;
  const isValidDiscriminator = discriminatorPropCandidates.every((p) => p.name === propertyName && !p.isOptional);
  const everyTypeHasDiscriminator = discriminatorPropCandidates.length === typeAstList.length;
  const isDiscriminatedUnion = isValidDiscriminator && everyTypeHasDiscriminator;
  invariant(isDiscriminatedUnion, 'type ambiguity: every type in a union must have a single unique-literal field');
  return discriminatorPropCandidates;
};

/**
 * Used to check that rootAst is for a type matching the provided predicate.
 * That's not always straightforward because types of optionality and recursive types.
 * const Task = Schema.Struct({
 *   ...,
 *   previous?: Schema.optional(Schema.suspend(() => Task)),
 * });
 * Here the AST for `previous` field is going to be Union(Suspend(Type), Undefined).
 * SchemaAST.isTypeLiteral(field) will return false, but unwrapAst(field, (ast) => SchemaAST.isTypeLiteral(ast))
 * will return true.
 */
const unwrapAst = (rootAst: SchemaAST.AST, predicate?: (ast: SchemaAST.AST) => boolean): SchemaAST.AST | null => {
  let ast: SchemaAST.AST | undefined = rootAst;
  while (ast != null) {
    if (predicate?.(ast)) {
      return ast;
    }

    if (SchemaAST.isUnion(ast)) {
      const next: any = ast.types.find((t) => (predicate != null && predicate(t)) || SchemaAST.isSuspend(t));
      if (next != null) {
        ast = next;
        continue;
      }
    }

    if (SchemaAST.isSuspend(ast)) {
      ast = ast.f();
    } else {
      return predicate == null ? ast : null;
    }
  }

  return null;
};

const unwrapArray = (ast: SchemaAST.AST) => unwrapAst(ast, SchemaAST.isTupleType) as SchemaAST.TupleType | null;

const getIndexSignatureValueType = (ast: SchemaAST.AST): SchemaAST.AST | null => {
  const typeLiteral = unwrapAst(ast, SchemaAST.isTypeLiteral);
  if (typeLiteral == null || !SchemaAST.isTypeLiteral(typeLiteral) || typeLiteral.indexSignatures.length === 0) {
    return null;
  }

  return unwrapAst(typeLiteral.indexSignatures[0].type);
};

const resolveTypeLiteral = (
  ast: SchemaAST.AST,
  getTargetPropertyFn: (propertyName: string) => unknown,
): SchemaAST.TypeLiteral | null => {
  const anyOrObject = unwrapAst(
    ast,
    (candidate) =>
      SchemaAST.isAnyKeyword(candidate) ||
      SchemaAST.isUnknownKeyword(candidate) ||
      SchemaAST.isObjectKeyword(candidate),
  );
  if (anyOrObject != null) {
    return null;
  }

  const typeOrDiscriminatedUnion = unwrapAst(ast, (type) => {
    return SchemaAST.isTypeLiteral(type) || (SchemaAST.isUnion(type) && type.types.some((member) => SchemaAST.isTypeLiteral(member)));
  });
  if (typeOrDiscriminatedUnion == null) {
    return null;
  }

  if (SchemaAST.isTypeLiteral(typeOrDiscriminatedUnion)) {
    return typeOrDiscriminatedUnion;
  }

  const typeAstList = typeOrDiscriminatedUnion.types.filter((type) => SchemaAST.isTypeLiteral(type)) as SchemaAST.TypeLiteral[];
  if (typeAstList.length === 1) {
    return typeAstList[0];
  }

  const typeDiscriminators = getTypeDiscriminators(typeAstList);
  const targetPropertyValue = getTargetPropertyFn(String(typeDiscriminators[0].name));
  const typeIndex = typeDiscriminators.findIndex((property) => targetPropertyValue === (property.type as SchemaAST.Literal).literal);
  invariant(typeIndex !== -1, 'discriminator field not set on target');
  return typeAstList[typeIndex];
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value instanceof Uint8Array) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const formatPropertyPath = (path: KeyPath): string => path.map(String).join('.');

export const checkIdNotPresentOnSchema = (schema: Schema.Schema<any, any, any>) => {
  invariant(SchemaAST.isTypeLiteral(schema.ast));
  const idProperty = SchemaAST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'id');
  if (idProperty != null) {
    throw new Error('"id" property name is reserved');
  }
};

// TODO(burdon): Reconcile with JsonPath.
type KeyPath = readonly (string | number)[];
