//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { Option, pipe } from 'effect';

import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

//
// Refs
// https://effect.website/docs/schema/introduction
// https://www.npmjs.com/package/@effect/schema
// https://effect-ts.github.io/effect/schema/AST.ts.html
//

// TODO(burdon): Handle tuples?
export type SimpleType = 'object' | 'string' | 'number' | 'boolean' | 'enum' | 'literal';

/**
 * Get the base type; e.g., traverse through refinements.
 */
export const getSimpleType = (node: AST.AST): SimpleType | undefined => {
  if (AST.isObjectKeyword(node) || AST.isTypeLiteral(node) || isDiscriminatedUnion(node)) {
    return 'object';
  }

  if (AST.isStringKeyword(node)) {
    return 'string';
  }
  if (AST.isNumberKeyword(node)) {
    return 'number';
  }
  if (AST.isBooleanKeyword(node)) {
    return 'boolean';
  }

  if (AST.isEnums(node)) {
    return 'enum';
  }

  if (AST.isLiteral(node)) {
    return 'literal';
  }
};

export const isSimpleType = (node: AST.AST) => !!getSimpleType(node);

//
// Branded types
//

export type JsonProp = string & { __JsonPath: true; __JsonProp: true };
export type JsonPath = string & { __JsonPath: true };

const PATH_REGEX = /[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*/;
const PROP_REGEX = /\w+/;

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 */
export const JsonPath = S.NonEmptyString.pipe(S.pattern(PATH_REGEX)) as any as S.Schema<JsonPath>;
export const JsonProp = S.NonEmptyString.pipe(S.pattern(PROP_REGEX)) as any as S.Schema<JsonProp>;

/**
 * Get annotation or return undefined.
 */
export const getAnnotation =
  <T>(annotationId: symbol) =>
  (node: AST.Annotated): T | undefined =>
    pipe(AST.getAnnotation<T>(annotationId)(node), Option.getOrUndefined);

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

export type Tester = (node: AST.AST, path: Path, depth: number) => VisitResult | undefined;
export type Visitor = (node: AST.AST, path: Path, depth: number) => void;

const defaultTest: Tester = (node) => (isSimpleType(node) ? VisitResult.CONTINUE : VisitResult.SKIP);

/**
 * Visit leaf nodes.
 * Refs:
 * - https://github.com/syntax-tree/unist-util-visit?tab=readme-ov-file#visitor
 * - https://github.com/syntax-tree/unist-util-is?tab=readme-ov-file#test
 */
export const visit: {
  (node: AST.AST, visitor: Visitor): void;
  (node: AST.AST, test: Tester, visitor: Visitor): void;
} = (node: AST.AST, testOrVisitor: Tester | Visitor, visitor?: Visitor): void => {
  if (!visitor) {
    visitNode(node, defaultTest, testOrVisitor);
  } else {
    visitNode(node, testOrVisitor as Tester, visitor);
  }
};

const visitNode = (
  node: AST.AST,
  test: Tester | undefined,
  visitor: Visitor,
  path: Path = [],
  depth = 0,
): VisitResult | undefined => {
  const result = test?.(node, path, depth) ?? VisitResult.CONTINUE;
  if (result === VisitResult.EXIT) {
    return result;
  }
  if (result !== VisitResult.SKIP) {
    visitor(node, path, depth);
  }

  // Object.
  if (AST.isTypeLiteral(node)) {
    for (const prop of AST.getPropertySignatures(node)) {
      const currentPath = [...path, prop.name.toString()];
      const result = visitNode(prop.type, test, visitor, currentPath, depth + 1);
      if (result === VisitResult.EXIT) {
        return result;
      }
    }
  }

  // Array.
  else if (AST.isTupleType(node)) {
    for (const [i, element] of node.elements.entries()) {
      const currentPath = [...path, i];
      const result = visitNode(element.type, test, visitor, currentPath, depth);
      if (result === VisitResult.EXIT) {
        return result;
      }
    }
  }

  // Branching union (e.g., optional, discriminated unions).
  else if (AST.isUnion(node)) {
    for (const type of node.types) {
      const result = visitNode(type, test, visitor, path, depth);
      if (result === VisitResult.EXIT) {
        return result;
      }
    }
  }

  // Refinement.
  else if (AST.isRefinement(node)) {
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
// TODO(burdon): Rewrite using visitNode.
export const findNode = (node: AST.AST, test: (node: AST.AST) => boolean): AST.AST | undefined => {
  if (test(node)) {
    return node;
  }

  // Object.
  else if (AST.isTypeLiteral(node)) {
    for (const prop of AST.getPropertySignatures(node)) {
      const child = findNode(prop.type, test);
      if (child) {
        return child;
      }
    }
  }

  // Tuple.
  else if (AST.isTupleType(node)) {
    for (const [_, element] of node.elements.entries()) {
      const child = findNode(element.type, test);
      if (child) {
        return child;
      }
    }
  }

  // Branching union (e.g., optional, discriminated unions).
  else if (AST.isUnion(node)) {
    if (isOption(node)) {
      for (const type of node.types) {
        const child = findNode(type, test);
        if (child) {
          return child;
        }
      }
    }
  }

  // Refinement.
  else if (AST.isRefinement(node)) {
    return findNode(node.from, test);
  }

  return undefined;
};

/**
 * Get the AST node for the given property (dot-path).
 */
export const findProperty = (schema: S.Schema<any>, path: JsonPath | JsonProp): AST.AST | undefined => {
  const getProp = (node: AST.AST, path: JsonProp[]): AST.AST | undefined => {
    const [name, ...rest] = path;
    const typeNode = findNode(node, AST.isTypeLiteral);
    invariant(typeNode);
    for (const prop of AST.getPropertySignatures(typeNode)) {
      if (prop.name === name) {
        if (rest.length) {
          return getProp(prop.type, rest);
        } else {
          return prop.type;
        }
      }
    }

    return undefined;
  };

  return getProp(schema.ast, path.split('.') as JsonProp[]);
};

//
// Annotations
//

/**
 * Recursively descend into AST to find first matching annotations
 */
export const findAnnotation = <T>(node: AST.AST, annotationId: symbol): T | undefined => {
  const getAnnotationById = getAnnotation(annotationId);

  const getBaseAnnotation = (node: AST.AST): T | undefined => {
    const value = getAnnotationById(node);
    if (value !== undefined) {
      return value as T;
    }

    if (AST.isUnion(node)) {
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
 * Effect S.optional creates a union type with undefined as the second type.
 */
export const isOption = (node: AST.AST): boolean => {
  return AST.isUnion(node) && node.types.length === 2 && AST.isUndefinedKeyword(node.types[1]);
};

/**
 * Determines if the node is a union of literal types.
 */
export const isLiteralUnion = (node: AST.AST): boolean => {
  return AST.isUnion(node) && node.types.every(AST.isLiteral);
};

/**
 * Determines if the node is a discriminated union.
 */
export const isDiscriminatedUnion = (node: AST.AST): boolean => {
  return AST.isUnion(node) && !!getDiscriminatingProps(node)?.length;
};

/**
 * Get the discriminating properties for the given union type.
 */
export const getDiscriminatingProps = (node: AST.AST): string[] | undefined => {
  invariant(AST.isUnion(node));
  if (isOption(node)) {
    return;
  }

  // Get common literals across all types.
  return node.types.reduce<string[]>((shared, type) => {
    const props = AST.getPropertySignatures(type)
      // TODO(burdon): Should check each literal is unique.
      .filter((p) => AST.isLiteral(p.type))
      .map((p) => p.name.toString());

    // Return common literals.
    return shared.length === 0 ? props : shared.filter((prop) => props.includes(prop));
  }, []);
};

/**
 * Get the discriminated type for the given value.
 */
export const getDiscriminatedType = (node: AST.AST, value: any): AST.AST | undefined => {
  invariant(AST.isUnion(node));
  invariant(value);
  const props = getDiscriminatingProps(node);
  if (!props?.length) {
    return;
  }

  // Match provided value.
  for (const type of node.types) {
    const match = AST.getPropertySignatures(type)
      .filter((prop) => props?.includes(prop.name.toString()))
      .every((prop) => {
        invariant(AST.isLiteral(prop.type));
        return prop.type.literal === value[prop.name.toString()];
      });

    if (match) {
      return type;
    }
  }

  // Create union of discriminating properties.
  // NOTE: This may not work with non-overlapping variants.
  // TODO(burdon): Iterate through props and knock-out variants that don't match.
  const p = props
    .map((prop) => {
      const literals = node.types
        .map((type) => {
          const literal = AST.getPropertySignatures(type).find((p) => p.name.toString() === prop);
          if (literal) {
            invariant(AST.isLiteral(literal.type));
            return literal.type.literal;
          } else {
            return undefined;
          }
        })
        .filter(nonNullable);

      return literals.length
        ? {
            name: prop,
            literals,
          }
        : null;
    })
    .filter(nonNullable);

  const fields = Object.fromEntries(p.map(({ name, literals = [] }) => [name, S.Literal(...literals)]));
  const schema = S.Struct(fields);
  return schema.ast;
};
