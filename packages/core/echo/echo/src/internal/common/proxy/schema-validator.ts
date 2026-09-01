//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaIssue from 'effect/SchemaIssue';

import { SchemaAST, SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { SchemaId } from '../types/index.ts';

// TODO(burdon): Reconcile with @dxos/effect visit().

/** Formats v4 schema issues; the thrown validation error carries the issue as its `cause`. */
const formatIssue = SchemaIssue.makeFormatterStandardSchemaV1();

/**
 * Asserts a value against a schema, naming the offending field.
 *
 * v4's `Schema.asserts` throws the fixed message "Schema validation failed" and puts the detail on
 * the error's `cause`, which leaves nothing actionable in a stack trace or a UI toast.
 */
export const assertsWithDetail = (schema: Schema.Top, value: unknown): void => {
  try {
    Schema.asserts(schema, value);
  } catch (err) {
    const issue = err instanceof Error ? err.cause : undefined;
    if (!SchemaIssue.isIssue(issue)) {
      throw err;
    }
    const detail = formatIssue(issue)
      .issues.map(({ message, path }) => (path && path.length > 0 ? `${path.join('.')}: ${message}` : message))
      .join('; ');
    throw new Error(detail.length > 0 ? `Schema validation failed — ${detail}` : 'Schema validation failed', {
      cause: issue,
    });
  }
};

export class SchemaValidator {
  /**
   * Recursively check that schema specifies constructions we can handle.
   * Validates there are no ambiguous discriminated union types.
   */
  public static validateSchema(schema: Schema.Top): void {
    const visitAll = (nodes: SchemaAST.AST[]) => nodes.forEach((node) => this.validateSchema(Schema.make(node)));
    if (SchemaAST.isUnion(schema.ast)) {
      const typeAstList = schema.ast.types.filter((type) => SchemaAST.isObjects(type)) as SchemaAST.Objects[];
      // Check we can handle a discriminated union.
      if (typeAstList.length > 1) {
        getTypeDiscriminators(typeAstList);
      }
      visitAll(typeAstList);
    } else if (SchemaAST.isArrays(schema.ast)) {
      const allTypes = [...schema.ast.elements, ...schema.ast.rest];
      visitAll(allTypes);
    } else if (SchemaAST.isObjects(schema.ast)) {
      visitAll(SchemaAST.getPropertySignatures(schema.ast).map((p) => p.type));
    }
  }

  public static hasTypeAnnotation(rootObjectSchema: Schema.Top, property: string, annotation: string): boolean {
    try {
      let type = this.getPropertySchema(rootObjectSchema, [property]);
      if (SchemaAST.isArrays(type.ast)) {
        type = this.getPropertySchema(rootObjectSchema, [property, '0']);
      }

      return SchemaAST.getAnnotation(type.ast, annotation) != null;
    } catch {
      return false;
    }
  }

  public static getPropertySchema(
    rootObjectSchema: Schema.Top,
    propertyPath: KeyPath,
    getProperty: (path: KeyPath) => any = () => null,
  ): Schema.Top {
    let schema: Schema.Top = rootObjectSchema;
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
            schema = Schema.make<Schema.Top>(indexSignatureType);
            continue;
          }

          throw new TypeError(`Unknown property: ${formatPropertyPath([...propertyPath.slice(0, i), propertyName])}`);
        }

        schema = Schema.make<Schema.Top>(propertyType);
      }
    }

    return schema;
  }

  /**
   * Rejects properties not declared on the schema. Types with index signatures allow extra keys.
   */
  public static assertExactProperties(
    schema: Schema.Top,
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

        const indexSchema = Schema.make<Schema.Top>(indexSignatureType);
        this.assertExactProperties(indexSchema, value[key], getProperty, propertyPath);
        continue;
      }

      const propertySignature = propertySignatures.find((property) => String(property.name) === key);
      invariant(propertySignature, 'Property signature must exist.');
      const propertySchema = Schema.make<Schema.Top>(propertySignature.type);
      this.assertExactProperties(propertySchema, value[key], getProperty, propertyPath);
    }
  }

  public static getIndexedElementSchema(schema: Schema.Top, index: number | string): Schema.Top | null {
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

  /**
   * Whether the property may be cleared.
   *
   * v4 records optionality as `context.isOptional` on the property's own type rather than widening
   * it to `T | undefined`, so the property's schema alone no longer admits `undefined`.
   */
  public static isOptionalProperty(target: any, prop: string | symbol): boolean {
    const schema: Schema.Top | undefined = (target as any)[SchemaId];
    if (!schema || typeof prop === 'symbol') {
      return false;
    }
    const property = SchemaAST.getPropertySignatures(schema.ast).find((candidate) => candidate.name === prop);
    return property != null && SchemaAST.isOptional(property.type);
  }

  public static getTargetPropertySchema(target: any, prop: string | symbol): Schema.Top {
    const schema: Schema.Top | undefined = (target as any)[SchemaId];
    invariant(schema, 'target has no schema');

    if (Array.isArray(target)) {
      if (prop === 'length') {
        return Schema.Number;
      }

      if (typeof prop !== 'symbol') {
        const indexedSchema = this.getIndexedElementSchema(schema, prop);
        if (indexedSchema != null) {
          return indexedSchema;
        }
      }

      // Arrays sometimes carry the element struct as their stamped schema.
      if (SchemaAST.isObjects(schema.ast)) {
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
        return Schema.make<Schema.Top>(indexSignatureType);
      }

      throw new TypeError(`Unknown property: ${String(prop)}`);
    }

    return Schema.make<Schema.Top>(propertyType);
  }
}

/**
 * Tuple AST is used both for:
 * fixed-length tuples ([string, number]) in which case AST will be { elements: [Schema.String, Schema.Number] }
 * variable-length arrays (Array<string | number>) in which case AST will be { rest: [Schema.Union([Schema.String, Schema.Number])] }
 */
const getArrayElementSchema = (tupleAst: SchemaAST.Arrays, property: string | symbol | number): Schema.Top => {
  const elementIndex =
    typeof property === 'number' ? property : typeof property === 'string' ? parseInt(property, 10) : Number.NaN;
  if (Number.isNaN(elementIndex)) {
    invariant(property === 'length', `invalid array property: ${String(property)}`);
    return Schema.Number;
  }
  if (elementIndex < tupleAst.elements.length) {
    return Schema.make<Schema.Top>(tupleAst.elements[elementIndex]);
  }

  return Schema.make<Schema.Top>(tupleAst.rest[0]);
};

const flattenUnion = (typeAst: SchemaAST.AST): SchemaAST.AST[] =>
  SchemaAST.isUnion(typeAst) ? typeAst.types.flatMap(flattenUnion) : [typeAst];

const getProperties = (
  typeAst: SchemaAST.AST,
  getTargetPropertyFn: (propertyName: string) => any,
): ReadonlyArray<SchemaAST.PropertySignature> => {
  const astCandidates = flattenUnion(typeAst);
  const typeAstList = astCandidates.filter((type) => SchemaAST.isObjects(type)) as SchemaAST.Objects[];
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
    return SchemaAST.isObjects(t) || (SchemaAST.isUnion(t) && t.types.some((t) => SchemaAST.isObjects(t)));
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

  const indexSignatureType = unwrapAst(ast, SchemaAST.isObjects);
  if (indexSignatureType && SchemaAST.isObjects(indexSignatureType) && indexSignatureType.indexSignatures.length > 0) {
    return unwrapAst(indexSignatureType.indexSignatures[0].type);
  }

  return null;
};

/**
 * Unwraps the shapes a tag takes on after a JSON schema round-trip: optional (its constructor
 * default leaves it out of `required`) and single-member union (a one-entry `anyOf`).
 */
const unwrapDiscriminator = (ast: SchemaAST.AST): SchemaAST.AST => {
  const unwrapped = SchemaEx.unwrapOptional(ast);
  return SchemaAST.isUnion(unwrapped) && unwrapped.types.length === 1
    ? unwrapDiscriminator(unwrapped.types[0])
    : unwrapped;
};

const getTypeDiscriminators = (typeAstList: SchemaAST.Objects[]): SchemaAST.PropertySignature[] => {
  const discriminatorPropCandidates = typeAstList
    .flatMap(SchemaAST.getPropertySignatures)
    .filter((p) => SchemaAST.isLiteral(unwrapDiscriminator(p.type)));
  const propertyName = discriminatorPropCandidates[0]?.name;
  // Optionality cannot disqualify a candidate: a round-tripped discriminator's constructor default
  // leaves it optional, and the round trip erases what would distinguish it from an authored one.
  const isValidDiscriminator =
    propertyName !== undefined && discriminatorPropCandidates.every((p) => p.name === propertyName);
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
 * SchemaAST.isObjects(field) will return false, but unwrapAst(field, (ast) => SchemaAST.isObjects(ast))
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
      ast = ast.thunk();
    } else {
      return predicate == null ? ast : null;
    }
  }

  return null;
};

const unwrapArray = (ast: SchemaAST.AST) => unwrapAst(ast, SchemaAST.isArrays) as SchemaAST.Arrays | null;

const getIndexSignatureValueType = (ast: SchemaAST.AST): SchemaAST.AST | null => {
  const typeLiteral = unwrapAst(ast, SchemaAST.isObjects);
  if (typeLiteral == null || !SchemaAST.isObjects(typeLiteral) || typeLiteral.indexSignatures.length === 0) {
    return null;
  }

  return unwrapAst(typeLiteral.indexSignatures[0].type);
};

const resolveTypeLiteral = (
  ast: SchemaAST.AST,
  getTargetPropertyFn: (propertyName: string) => unknown,
): SchemaAST.Objects | null => {
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
    return (
      SchemaAST.isObjects(type) || (SchemaAST.isUnion(type) && type.types.some((member) => SchemaAST.isObjects(member)))
    );
  });
  if (typeOrDiscriminatedUnion == null) {
    return null;
  }

  if (SchemaAST.isObjects(typeOrDiscriminatedUnion)) {
    return typeOrDiscriminatedUnion;
  }

  if (!SchemaAST.isUnion(typeOrDiscriminatedUnion)) {
    return null;
  }

  const typeAstList = typeOrDiscriminatedUnion.types.filter((type) => SchemaAST.isObjects(type)) as SchemaAST.Objects[];
  if (typeAstList.length === 1) {
    return typeAstList[0];
  }

  const typeDiscriminators = getTypeDiscriminators(typeAstList);
  const targetPropertyValue = getTargetPropertyFn(String(typeDiscriminators[0].name));
  const typeIndex = typeDiscriminators.findIndex(
    (property) => targetPropertyValue === (property.type as SchemaAST.Literal).literal,
  );
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

export const checkIdNotPresentOnSchema = (schema: Schema.Codec<any, any, any>) => {
  invariant(SchemaAST.isObjects(schema.ast));
  const idProperty = SchemaAST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'id');
  if (idProperty != null) {
    throw new Error('"id" property name is reserved');
  }
};

// TODO(burdon): Reconcile with JsonPath.
type KeyPath = readonly (string | number)[];
