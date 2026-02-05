//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';
import { isNonNullable } from '@dxos/util';

import { type JsonPath, type JsonProp } from './json-path';

//
// Refs
// https://effect.website/docs/schema/introduction
// https://www.npmjs.com/package/@effect/schema
// https://effect-ts.github.io/effect/schema/SchemaAST.ts.html
//

/**
 * Unwraps and collects refinement filters.
 */
const reduceRefinements = (
  type: SchemaAST.AST,
  refinements: SchemaAST.Refinement['filter'][] = [],
): { type: SchemaAST.AST; refinements: SchemaAST.Refinement['filter'][] } => {
  if (SchemaAST.isRefinement(type)) {
    const annotations = type.annotations;
    const filter = type.filter;
    const nextType = { ...type.from, annotations: { ...type.annotations, ...annotations } } as SchemaAST.AST;
    return reduceRefinements(nextType, [...refinements, filter]);
  }

  return { type, refinements };
};

/**
 * Get the base type of a property.
 *
 * Unwraps refinements and optional unions.
 */
export const getBaseType = (
  prop: SchemaAST.PropertySignature | SchemaProperty,
): { type: SchemaAST.AST; refinements: SchemaAST.Refinement['filter'][] } => {
  const encoded = SchemaAST.encodedBoundAST(prop.type);
  // Extract property ast from optional union.
  const unwrapped = prop.isOptional && encoded._tag === 'Union' ? encoded.types[0] : encoded;
  return reduceRefinements(unwrapped);
};

export type SchemaProperty = Pick<SchemaAST.PropertySignature, 'name' | 'type' | 'isOptional' | 'isReadonly'> & {
  /** Can be used to validate the property to the spec of the initial AST. */
  refinements: SchemaAST.Refinement['filter'][];
};

/**
 * Get the property types of an AST.
 */
export const getProperties = (ast: SchemaAST.AST): SchemaProperty[] => {
  const properties = SchemaAST.getPropertySignatures(ast);
  return properties.map((prop) => ({
    ...getBaseType(prop),
    name: prop.name,
    isOptional: prop.isOptional,
    isReadonly: prop.isReadonly,
  }));
};

//
// Branded types
//

export enum VisitResult {
  CONTINUE = 0,
  /**
   * Skip visiting children.
   */
  SKIP = 1,
  /**
   * Stop traversing immediately.
   */
  EXIT = 2,
}

export type Path = (string | number)[];

export type TestFn = (node: SchemaAST.AST, path: Path, depth: number) => VisitResult | boolean | undefined;

export type VisitorFn = (node: SchemaAST.AST, path: Path, depth: number) => void;

/**
 * Visit leaf nodes.
 * Refs:
 * - https://github.com/syntax-tree/unist-util-visit?tab=readme-ov-file#visitor
 * - https://github.com/syntax-tree/unist-util-is?tab=readme-ov-file#test
 */
export const visit = (node: SchemaAST.AST, testOrVisitor: TestFn | VisitorFn, visitor: VisitorFn): void => {
  visitNode(node, testOrVisitor as TestFn, visitor);
};

const visitNode = (
  node: SchemaAST.AST,
  test: TestFn | undefined,
  visitor: VisitorFn,
  path: Path = [],
  depth = 0,
): VisitResult | undefined => {
  const $result = test?.(node, path, depth);
  const result: VisitResult =
    $result === undefined
      ? VisitResult.CONTINUE
      : typeof $result === 'boolean'
        ? $result
          ? VisitResult.CONTINUE
          : VisitResult.SKIP
        : $result;

  if (result === VisitResult.EXIT) {
    return result;
  }
  if (result !== VisitResult.SKIP) {
    visitor(node, path, depth);
  }

  // Object.
  if (SchemaAST.isTypeLiteral(node)) {
    for (const prop of SchemaAST.getPropertySignatures(node)) {
      const currentPath = [...path, prop.name.toString()];
      const result = visitNode(prop.type, test, visitor, currentPath, depth + 1);
      if (result === VisitResult.EXIT) {
        return result;
      }
    }
  }

  // Array.
  else if (SchemaAST.isTupleType(node)) {
    for (const [i, element] of node.elements.entries()) {
      const currentPath = [...path, i];
      const result = visitNode(element.type, test, visitor, currentPath, depth);
      if (result === VisitResult.EXIT) {
        return result;
      }
    }
  }

  // Branching union (e.g., optional, discriminated unions).
  else if (SchemaAST.isUnion(node)) {
    for (const type of node.types) {
      const result = visitNode(type, test, visitor, path, depth);
      if (result === VisitResult.EXIT) {
        return result;
      }
    }
  }

  // Refinement.
  else if (SchemaAST.isRefinement(node)) {
    const result = visitNode(node.from, test, visitor, path, depth);
    if (result === VisitResult.EXIT) {
      return result;
    }
  }

  // TODO(burdon): Transforms?
};

/**
 * Recursively descend into AST to find first node that passes the test.
 */
// TODO(burdon): Rewrite using visitNode?
export const findNode = (node: SchemaAST.AST, test: (node: SchemaAST.AST) => boolean): SchemaAST.AST | undefined => {
  if (test(node)) {
    return node;
  }

  // Object.
  else if (SchemaAST.isTypeLiteral(node)) {
    for (const prop of SchemaAST.getPropertySignatures(node)) {
      const child = findNode(prop.type, test);
      if (child) {
        return child;
      }
    }
    for (const prop of getIndexSignatures(node)) {
      const child = findNode(prop.type, test);
      if (child) {
        return child;
      }
    }
  }

  // Tuple.
  else if (SchemaAST.isTupleType(node)) {
    for (const [_, element] of node.elements.entries()) {
      const child = findNode(element.type, test);
      if (child) {
        return child;
      }
    }
  }

  // Branching union (e.g., optional, discriminated unions).
  else if (SchemaAST.isUnion(node)) {
    if (isLiteralUnion(node)) {
      return undefined;
    }

    for (const type of node.types) {
      const child = findNode(type, test);
      if (child) {
        return child;
      }
    }
  }

  // Refinement.
  else if (SchemaAST.isRefinement(node)) {
    return findNode(node.from, test);
  }
};

/**
 * Get the AST node for the given property (dot-path).
 */
export const findProperty = (
  schema: Schema.Schema.AnyNoContext,
  path: JsonPath | JsonProp,
): SchemaAST.AST | undefined => {
  const getProp = (node: SchemaAST.AST, path: JsonProp[]): SchemaAST.AST | undefined => {
    const [name, ...rest] = path;
    const typeNode = findNode(node, SchemaAST.isTypeLiteral);
    invariant(typeNode);
    for (const prop of SchemaAST.getPropertySignatures(typeNode)) {
      if (prop.name === name) {
        if (rest.length) {
          return getProp(prop.type, rest);
        } else {
          return prop.type;
        }
      }
    }
  };

  return getProp(schema.ast, path.split('.') as JsonProp[]);
};

//
// Annotations
//

const defaultAnnotations: Record<string, SchemaAST.Annotated> = {
  ['ObjectKeyword' as const]: SchemaAST.objectKeyword,
  ['StringKeyword' as const]: SchemaAST.stringKeyword,
  ['NumberKeyword' as const]: SchemaAST.numberKeyword,
  ['BooleanKeyword' as const]: SchemaAST.booleanKeyword,
};

/**
 * Get annotation or return undefined.
 * @param annotationId
 * @param noDefault If true, then return undefined for effect library defined values.
 */
export const getAnnotation =
  <T>(annotationId: symbol, noDefault = true) =>
  (node: SchemaAST.AST): T | undefined => {
    // Title fallback seems to be the identifier.
    const id = Function.pipe(SchemaAST.getIdentifierAnnotation(node), Option.getOrUndefined);
    const value = Function.pipe(SchemaAST.getAnnotation<T>(annotationId)(node), Option.getOrUndefined);
    if (noDefault && (value === defaultAnnotations[node._tag]?.annotations[annotationId] || value === id)) {
      return undefined;
    }

    return value;
  };

/**
 * Recursively descend into AST to find first matching annotations.
 * Optionally skips default annotations for basic types (e.g., 'a string').
 */
// TODO(burdon): Convert to effect pattern (i.e., return operator like getAnnotation).
export const findAnnotation = <T>(node: SchemaAST.AST, annotationId: symbol, noDefault = true): T | undefined => {
  const getAnnotationById = getAnnotation(annotationId, noDefault);

  const getBaseAnnotation = (node: SchemaAST.AST): T | undefined => {
    const value = getAnnotationById(node);
    if (value !== undefined) {
      return value as T;
    }

    if (SchemaAST.isUnion(node)) {
      if (isOption(node)) {
        return getAnnotationById(node.types[0]) as T;
      }
    }
  };

  return getBaseAnnotation(node);
};

//
// Unions
//

/**
 * Effect Schema.optional creates a union type with undefined as the second type.
 */
export const isOption = (node: SchemaAST.AST): boolean => {
  return SchemaAST.isUnion(node) && node.types.length === 2 && SchemaAST.isUndefinedKeyword(node.types[1]);
};

/**
 * Determines if the node is a union of literal types.
 */
export const isLiteralUnion = (node: SchemaAST.AST): node is SchemaAST.Union<SchemaAST.Literal> => {
  return SchemaAST.isUnion(node) && node.types.every(SchemaAST.isLiteral);
};

/**
 * Determines if the node is an array type.
 */
export const isArrayType = (node: SchemaAST.AST): node is SchemaAST.TupleType => {
  return SchemaAST.isTupleType(node) && node.elements.length === 0 && node.rest.length === 1;
};

/**
 * Get the type of the array elements.
 */
export const getArrayElementType = (node: SchemaAST.AST): SchemaAST.AST | undefined => {
  return isArrayType(node) ? node.rest.at(0)?.type : undefined;
};

/**
 * Determines if the node is a tuple type.
 */
export const isTupleType = (node: SchemaAST.AST): boolean => {
  return SchemaAST.isTupleType(node) && node.elements.length > 0;
};

/**
 * Determines if the node is a discriminated union.
 */
export const isDiscriminatedUnion = (node: SchemaAST.AST): boolean => {
  return SchemaAST.isUnion(node) && !!getDiscriminatingProps(node)?.length;
};

/**
 * Get the discriminating properties for the given union type.
 */
export const getDiscriminatingProps = (node: SchemaAST.AST): string[] | undefined => {
  invariant(SchemaAST.isUnion(node));
  if (isOption(node)) {
    return;
  }

  // Get common literals across all types.
  return node.types.reduce<string[]>((shared, type) => {
    const props = SchemaAST.getPropertySignatures(type)
      // TODO(burdon): Should check each literal is unique.
      .filter((p) => SchemaAST.isLiteral(p.type))
      .map((p) => p.name.toString());

    // Return common literals.
    return shared.length === 0 ? props : shared.filter((prop) => props.includes(prop));
  }, []);
};

/**
 * Get the discriminated type for the given value.
 */
export const getDiscriminatedType = (
  node: SchemaAST.AST,
  value: Record<string, any> = {},
): SchemaAST.AST | undefined => {
  invariant(SchemaAST.isUnion(node));
  invariant(value);
  const props = getDiscriminatingProps(node);
  if (!props?.length) {
    return;
  }

  // Match provided values.
  for (const type of node.types) {
    const match = SchemaAST.getPropertySignatures(type)
      .filter((prop) => props?.includes(prop.name.toString()))
      .every((prop) => {
        invariant(SchemaAST.isLiteral(prop.type));
        return prop.type.literal === value[prop.name.toString()];
      });

    if (match) {
      return type;
    }
  }

  // Create union of discriminating properties.
  // NOTE: This may not work with non-overlapping variants.
  // TODO(burdon): Iterate through props and knock-out variants that don't match.
  const fields = Object.fromEntries(
    props
      .map((prop) => {
        const literals = node.types
          .map((type) => {
            const literal = SchemaAST.getPropertySignatures(type).find((p) => p.name.toString() === prop)!;
            invariant(SchemaAST.isLiteral(literal.type));
            return literal.type.literal;
          })
          .filter(isNonNullable);

        return literals.length ? [prop, Schema.Literal(...literals)] : undefined;
      })
      .filter(isNonNullable),
  );

  const schema = Schema.Struct(fields);
  return schema.ast;
};

/**
 * Determines if the node is a nested object type.
 */
export const isNestedType = (node: SchemaAST.AST): boolean => {
  return (
    SchemaAST.isDeclaration(node) ||
    SchemaAST.isObjectKeyword(node) ||
    SchemaAST.isTypeLiteral(node) ||
    // TODO(wittjosiah): Tuples are actually arrays.
    isTupleType(node) ||
    isDiscriminatedUnion(node)
  );
};

/**
 * Maps AST nodes.
 * The user is responsible for recursively calling {@link mapAst} on the SchemaAST.
 * NOTE: Will evaluate suspended ASTs.
 */
export const mapAst = (
  ast: SchemaAST.AST,
  f: (ast: SchemaAST.AST, key: keyof any | undefined) => SchemaAST.AST,
): SchemaAST.AST => {
  switch (ast._tag) {
    case 'TypeLiteral': {
      return new SchemaAST.TypeLiteral(
        ast.propertySignatures.map(
          (prop) =>
            new SchemaAST.PropertySignature(
              prop.name,
              f(prop.type, prop.name),
              prop.isOptional,
              prop.isReadonly,
              prop.annotations,
            ),
        ),
        ast.indexSignatures,
        ast.annotations,
      );
    }
    case 'Union': {
      return SchemaAST.Union.make(ast.types.map(f), ast.annotations);
    }
    case 'TupleType': {
      return new SchemaAST.TupleType(
        ast.elements.map((t, index) => new SchemaAST.OptionalType(f(t.type, index), t.isOptional, t.annotations)),
        ast.rest.map((t) => new SchemaAST.Type(f(t.type, undefined), t.annotations)),
        ast.isReadonly,
        ast.annotations,
      );
    }
    case 'Suspend': {
      const newAst = f(ast.f(), undefined);
      return new SchemaAST.Suspend(() => newAst, ast.annotations);
    }
    default: {
      // TODO(dmaretskyi): Support more nodes.
      return ast;
    }
  }
};

const getIndexSignatures = (ast: SchemaAST.AST): Array<SchemaAST.IndexSignature> => {
  const annotation = SchemaAST.getSurrogateAnnotation(ast);
  if (Option.isSome(annotation)) {
    return getIndexSignatures(annotation.value);
  }
  switch (ast._tag) {
    case 'TypeLiteral':
      return ast.indexSignatures.slice();
    case 'Suspend':
      return getIndexSignatures(ast.f());
    case 'Refinement':
      return getIndexSignatures(ast.from);
  }
  return [];
};
