//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { getSchemaTypename } from './annotations';

// TODO(burdon): Reconcile with @dxos/effect visit().

export const symbolSchema = Symbol.for('@dxos/schema/Schema');

export class SchemaValidator {
  /**
   * Recursively check that schema specifies constructions we can handle.
   * Validates there are no ambiguous discriminated union types.
   */
  public static validateSchema(schema: S.Schema<any>) {
    const visitAll = (nodes: AST.AST[]) => nodes.forEach((node) => this.validateSchema(S.make(node)));
    if (AST.isUnion(schema.ast)) {
      const typeAstList = schema.ast.types.filter((type) => AST.isTypeLiteral(type)) as AST.TypeLiteral[];
      // Check we can handle a discriminated union.
      if (typeAstList.length > 1) {
        getTypeDiscriminators(typeAstList);
      }
      visitAll(typeAstList);
    } else if (AST.isTupleType(schema.ast)) {
      const positionalTypes = schema.ast.elements.map((t) => t.type);
      const allTypes = positionalTypes.concat(schema.ast.rest.map((t) => t.type));
      visitAll(allTypes);
    } else if (AST.isTypeLiteral(schema.ast)) {
      visitAll(AST.getPropertySignatures(schema.ast).map((p) => p.type));
    }
  }

  public static hasTypeAnnotation(rootObjectSchema: S.Schema<any>, property: string, annotation: symbol): boolean {
    try {
      let type = this.getPropertySchema(rootObjectSchema, [property]);
      if (AST.isTupleType(type.ast)) {
        type = this.getPropertySchema(rootObjectSchema, [property, '0']);
      }

      return type.ast.annotations[annotation] != null;
    } catch (err) {
      return false;
    }
  }

  public static getPropertySchema(
    rootObjectSchema: S.Schema<any>,
    propertyPath: KeyPath,
    getProperty: (path: KeyPath) => any = () => null,
  ): S.Schema<any> {
    let schema: S.Schema<any> = rootObjectSchema;
    for (let i = 0; i < propertyPath.length; i++) {
      const propertyName = propertyPath[i];
      const tupleAst = unwrapArray(schema.ast);
      if (tupleAst != null) {
        schema = getArrayElementSchema(tupleAst, propertyName);
      } else {
        const propertyType = getPropertyType(schema.ast, propertyName.toString(), (propertyName) =>
          getProperty([...propertyPath.slice(0, i), propertyName]),
        );
        if (!propertyType) {
          const type = getSchemaTypename(rootObjectSchema);
          invariant(propertyType, `unknown property: ${String(propertyName)} on ${type}. Path: ${propertyPath}`);
        }

        schema = S.make(propertyType).annotations(propertyType.annotations);
      }
    }

    return schema;
  }

  public static getTargetPropertySchema(target: any, prop: string | symbol): S.Schema<any> {
    const schema: S.Schema<any> | undefined = (target as any)[symbolSchema];
    invariant(schema, 'target has no schema');
    const arrayAst = unwrapArray(schema.ast);
    if (arrayAst != null) {
      return getArrayElementSchema(arrayAst, prop);
    }

    const propertyType = getPropertyType(schema.ast, prop.toString(), (prop) => target[prop]);
    invariant(propertyType, `invalid property: ${prop.toString()}`);
    return S.make(propertyType);
  }
}

/**
 * tuple AST is used both for:
 * fixed-length tuples ([string, number]) in which case AST will be { elements: [S.String, S.Number] }
 * variable-length arrays (Array<string | number>) in which case AST will be { rest: [S.Union(S.String, S.Number)] }
 */
const getArrayElementSchema = (tupleAst: AST.TupleType, property: string | symbol | number): S.Schema<any> => {
  const elementIndex = typeof property === 'string' ? parseInt(property, 10) : Number.NaN;
  if (Number.isNaN(elementIndex)) {
    invariant(property === 'length', `invalid array property: ${String(property)}`);
    return S.Number;
  }
  if (elementIndex < tupleAst.elements.length) {
    const elementType = tupleAst.elements[elementIndex].type;
    return S.make(elementType).annotations(elementType.annotations);
  }

  const restType = tupleAst.rest;
  return S.make(restType[0].type).annotations(restType[0].annotations);
};

const flattenUnion = (typeAst: AST.AST): AST.AST[] =>
  AST.isUnion(typeAst) ? typeAst.types.flatMap(flattenUnion) : [typeAst];

const getProperties = (
  typeAst: AST.AST,
  getTargetPropertyFn: (propertyName: string) => any,
): AST.PropertySignature[] => {
  const astCandidates = flattenUnion(typeAst);
  const typeAstList = astCandidates.filter((type) => AST.isTypeLiteral(type)) as AST.TypeLiteral[];
  if (typeAstList.length === 0) {
    return [];
  }
  if (typeAstList.length === 1) {
    return AST.getPropertySignatures(typeAstList[0]);
  }

  const typeDiscriminators = getTypeDiscriminators(typeAstList);
  const targetPropertyValue = getTargetPropertyFn(String(typeDiscriminators[0].name));
  const typeIndex = typeDiscriminators.findIndex((p) => targetPropertyValue === (p.type as AST.Literal).literal);
  invariant(typeIndex !== -1, 'discriminator field not set on target');
  return AST.getPropertySignatures(typeAstList[typeIndex]);
};

const getPropertyType = (
  ast: AST.AST,
  propertyName: string,
  getTargetPropertyFn: (propertyName: string) => any,
): AST.AST | null => {
  const anyOrObject = unwrapAst(ast, (candidate) => AST.isAnyKeyword(candidate) || AST.isObjectKeyword(candidate));
  if (anyOrObject != null) {
    return ast;
  }

  const typeOrDiscriminatedUnion = unwrapAst(ast, (t) => {
    return AST.isTypeLiteral(t) || (AST.isUnion(t) && t.types.some((t) => AST.isTypeLiteral(t)));
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

  const indexSignatureType = unwrapAst(ast, AST.isTypeLiteral);
  if (indexSignatureType && AST.isTypeLiteral(indexSignatureType) && indexSignatureType.indexSignatures.length > 0) {
    return unwrapAst(indexSignatureType.indexSignatures[0].type);
  }

  return null;
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

/**
 * Used to check that rootAst is for a type matching the provided predicate.
 * That's not always straightforward because types of optionality and recursive types.
 * const Task = S.Struct({
 *   ...,
 *   previous?: S.optional(S.suspend(() => Task)),
 * });
 * Here the AST for `previous` field is going to be Union(Suspend(Type), Undefined).
 * AST.isTypeLiteral(field) will return false, but unwrapAst(field, (ast) => AST.isTypeLiteral(ast))
 * will return true.
 */
const unwrapAst = (rootAst: AST.AST, predicate?: (ast: AST.AST) => boolean): AST.AST | null => {
  let ast: AST.AST | undefined = rootAst;
  while (ast != null) {
    if (predicate?.(ast)) {
      return ast;
    }

    if (AST.isUnion(ast)) {
      const next: any = ast.types.find((t) => (predicate != null && predicate(t)) || AST.isSuspend(t));
      if (next != null) {
        ast = next;
        continue;
      }
    }

    if (AST.isSuspend(ast)) {
      ast = ast.f();
    } else {
      return predicate == null ? ast : null;
    }
  }

  return null;
};

const unwrapArray = (ast: AST.AST) => unwrapAst(ast, AST.isTupleType) as AST.TupleType | null;

export const checkIdNotPresentOnSchema = (schema: S.Schema<any, any, any>) => {
  invariant(AST.isTypeLiteral(schema.ast));
  const idProperty = AST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'id');
  if (idProperty != null) {
    throw new Error('"id" property name is reserved');
  }
};

type KeyPath = readonly (string | number)[];
