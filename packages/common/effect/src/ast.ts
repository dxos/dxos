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

export const isSimpleType = (node: AST.AST): boolean => !!getSimpleType(node);

export namespace SimpleType {
  /**
   * Returns the default empty value for a given SimpleType.
   * Used for initializing new array values etc.
   */
  export const getDefaultValue = (type: SimpleType): any => {
    switch (type) {
      case 'string': {
        return '';
      }
      case 'number': {
        return 0;
      }
      case 'boolean': {
        return false;
      }
      case 'object': {
        return {};
      }
      default: {
        throw new Error(`Unsupported type for default value: ${type}`);
      }
    }
  };
}

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

export type TestFn = (node: AST.AST, path: Path, depth: number) => VisitResult | boolean | undefined;

export type VisitorFn = (node: AST.AST, path: Path, depth: number) => void;

const defaultTest: TestFn = isSimpleType;

/**
 * Visit leaf nodes.
 * Refs:
 * - https://github.com/syntax-tree/unist-util-visit?tab=readme-ov-file#visitor
 * - https://github.com/syntax-tree/unist-util-is?tab=readme-ov-file#test
 */
export const visit: {
  (node: AST.AST, visitor: VisitorFn): void;
  (node: AST.AST, test: TestFn, visitor: VisitorFn): void;
} = (node: AST.AST, testOrVisitor: TestFn | VisitorFn, visitor?: VisitorFn): void => {
  if (!visitor) {
    visitNode(node, defaultTest, testOrVisitor);
  } else {
    visitNode(node, testOrVisitor as TestFn, visitor);
  }
};

const visitNode = (
  node: AST.AST,
  test: TestFn | undefined,
  visitor: VisitorFn,
  path: Path = [],
  depth = 0,
): VisitResult | undefined => {
  const _result = test?.(node, path, depth);
  const result: VisitResult =
    _result === undefined
      ? VisitResult.CONTINUE
      : typeof _result === 'boolean'
        ? _result
          ? VisitResult.CONTINUE
          : VisitResult.SKIP
        : _result;

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
// TODO(burdon): Rewrite using visitNode?
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
  };

  return getProp(schema.ast, path.split('.') as JsonProp[]);
};

//
// Annotations
//

const defaultAnnotations: Record<string, AST.Annotated> = {
  ['ObjectKeyword' as const]: AST.objectKeyword,
  ['StringKeyword' as const]: AST.stringKeyword,
  ['NumberKeyword' as const]: AST.numberKeyword,
  ['BooleanKeyword' as const]: AST.booleanKeyword,
};

/**
 * Get annotation or return undefined.
 * @param annotationId
 * @param noDefault If true, then return undefined for effect library defined values.
 */
export const getAnnotation =
  <T>(annotationId: symbol, noDefault = true) =>
  (node: AST.AST): T | undefined => {
    // Title fallback seems to be the identifier.
    const id = pipe(AST.getIdentifierAnnotation(node), Option.getOrUndefined);
    const value = pipe(AST.getAnnotation<T>(annotationId)(node), Option.getOrUndefined);
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
export const findAnnotation = <T>(node: AST.AST, annotationId: symbol, noDefault = true): T | undefined => {
  const getAnnotationById = getAnnotation(annotationId, noDefault);

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
export const getDiscriminatedType = (node: AST.AST, value: Record<string, any> = {}): AST.AST | undefined => {
  invariant(AST.isUnion(node));
  invariant(value);
  const props = getDiscriminatingProps(node);
  if (!props?.length) {
    return;
  }

  // Match provided values.
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
  const fields = Object.fromEntries(
    props
      .map((prop) => {
        const literals = node.types
          .map((type) => {
            const literal = AST.getPropertySignatures(type).find((p) => p.name.toString() === prop)!;
            invariant(AST.isLiteral(literal.type));
            return literal.type.literal;
          })
          .filter(nonNullable);

        return literals.length ? [prop, S.Literal(...literals)] : undefined;
      })
      .filter(nonNullable),
  );

  const schema = S.Struct(fields);
  return schema.ast;
};

/**
 * Maps AST nodes.
 * The user is responsible for recursively calling {@link mapAst} on the AST.
 * NOTE: Will evaluate suspended ASTs.
 */
export const mapAst = (ast: AST.AST, f: (ast: AST.AST) => AST.AST): AST.AST => {
  switch (ast._tag) {
    case 'TypeLiteral':
      return new AST.TypeLiteral(
        ast.propertySignatures.map(
          (prop) =>
            new AST.PropertySignature(prop.name, f(prop.type), prop.isOptional, prop.isReadonly, prop.annotations),
        ),
        ast.indexSignatures,
      );
    case 'Union':
      return AST.Union.make(ast.types.map(f), ast.annotations);
    case 'TupleType':
      return new AST.TupleType(
        ast.elements.map((t) => new AST.OptionalType(f(t.type), t.isOptional, t.annotations)),
        ast.rest.map((t) => new AST.Type(f(t.type), t.annotations)),
        ast.isReadonly,
        ast.annotations,
      );
    case 'Suspend': {
      const newAst = f(ast.f());
      return new AST.Suspend(() => newAst, ast.annotations);
    }
    default:
      // TODO(dmaretskyi): Support more nodes.
      return ast;
  }
};
