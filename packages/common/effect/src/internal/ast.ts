//
// Copyright 2024 DXOS.org
//
// v3 -> v4 AST mapping applied throughout:
//   TypeLiteral -> Objects            TupleType -> Arrays
//   *Keyword    -> bare node tags     Refinement -> `checks` on the node
//   PropertySignature carries only {name, type}; optionality/mutability/key
//   annotations live on `type.context`.
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type JsonPath, type JsonProp } from './json-path.ts';
import * as Compat from './schema-ast.ts';

/** Annotation keys are strings in v4 (they were symbols in v3). */
export type AnnotationKey = string;

export const annotateAst = Compat.annotate;
export const isMutable = Compat.isMutable;
export const resolveAnnotations = Compat.resolveAnnotations;

//
// Property signatures.
//

export const getPropertySignatures = Compat.getPropertySignatures;
export const getIndexSignatures = Compat.getIndexSignatures;
export const getChecks = Compat.getChecks;

/**
 * Get the base type of a property: strips the encoding chain and the optional union.
 */
export const getBaseType = (
  type: SchemaAST.AST,
): { type: SchemaAST.AST; checks: ReadonlyArray<SchemaAST.Check<any>> } => {
  const unwrapped = unwrapOptional(SchemaAST.toEncoded(type));
  return { type: unwrapped, checks: getChecks(unwrapped) };
};

export type SchemaProperty = {
  readonly name: PropertyKey;
  readonly type: SchemaAST.AST;
  readonly isOptional: boolean;
  readonly isReadonly: boolean;
  readonly checks: ReadonlyArray<SchemaAST.Check<any>>;
};

/**
 * Get the property types of an AST.
 */
export const getProperties = (ast: SchemaAST.AST): SchemaProperty[] =>
  getPropertySignatures(ast).map((prop) => {
    const { type, checks } = getBaseType(prop.type);
    // Key annotations (v3's PropertySignature.annotations) now hang off the type's context.
    const keyAnnotations = prop.type.context?.annotations;
    const mergedType =
      keyAnnotations && Object.keys(keyAnnotations).length > 0
        ? annotateAst(type, keyAnnotations as Schema.Annotations.Annotations)
        : type;
    return {
      name: prop.name,
      type: mergedType,
      checks,
      isOptional: SchemaAST.isOptional(prop.type),
      isReadonly: !isMutable(prop.type),
    };
  });

//
// Traversal.
//

export enum VisitResult {
  CONTINUE = 0,
  SKIP = 1,
  EXIT = 2,
}

export type Path = (string | number)[];

export type TestFn = (node: SchemaAST.AST, path: Path, depth: number) => VisitResult | boolean | undefined;

export type VisitorFn = (node: SchemaAST.AST, path: Path, depth: number) => void;

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

  if (node._tag === 'Objects') {
    for (const prop of node.propertySignatures) {
      const child = visitNode(prop.type, test, visitor, [...path, prop.name.toString()], depth + 1);
      if (child === VisitResult.EXIT) {
        return child;
      }
    }
  } else if (node._tag === 'Arrays') {
    for (const [index, element] of node.elements.entries()) {
      const child = visitNode(element, test, visitor, [...path, index], depth);
      if (child === VisitResult.EXIT) {
        return child;
      }
    }
    for (const rest of node.rest) {
      const child = visitNode(rest, test, visitor, path, depth);
      if (child === VisitResult.EXIT) {
        return child;
      }
    }
  } else if (node._tag === 'Union') {
    for (const type of node.types) {
      const child = visitNode(type, test, visitor, path, depth);
      if (child === VisitResult.EXIT) {
        return child;
      }
    }
  }
};

/**
 * Recursively descend into AST to find the first node that passes the test.
 */
export const findNode = (node: SchemaAST.AST, test: (node: SchemaAST.AST) => boolean): SchemaAST.AST | undefined => {
  if (test(node)) {
    return node;
  }

  if (node._tag === 'Objects') {
    for (const prop of node.propertySignatures) {
      const child = findNode(prop.type, test);
      if (child) {
        return child;
      }
    }
    for (const index of node.indexSignatures) {
      const child = findNode(index.type, test);
      if (child) {
        return child;
      }
    }
  } else if (node._tag === 'Arrays') {
    for (const element of node.elements) {
      const child = findNode(element, test);
      if (child) {
        return child;
      }
    }
    for (const rest of node.rest) {
      const child = findNode(rest, test);
      if (child) {
        return child;
      }
    }
  } else if (node._tag === 'Union') {
    if (isLiteralUnion(node)) {
      return undefined;
    }
    for (const type of node.types) {
      const child = findNode(type, test);
      if (child) {
        return child;
      }
    }
  } else if (node._tag === 'Suspend') {
    return findNode(node.thunk(), test);
  }
};

/**
 * Get the AST node for the given property (dot-path).
 */
export const findProperty = (schema: Schema.Top, path: JsonPath | JsonProp): SchemaAST.AST | undefined => {
  const getProp = (node: SchemaAST.AST, segments: string[]): SchemaAST.AST | undefined => {
    const [name, ...rest] = segments;
    const typeNode = findNode(node, (candidate) => candidate._tag === 'Objects');
    if (!typeNode) {
      return undefined;
    }
    for (const prop of getPropertySignatures(typeNode)) {
      if (prop.name === name) {
        return rest.length ? getProp(prop.type, rest) : prop.type;
      }
    }
  };

  return getProp(schema.ast, (path as string).split('.'));
};

//
// Annotations.
//

/**
 * v4 annotations are a plain string-keyed record, so the v3 dance of stripping
 * library defaults collapses to a lookup plus an identifier guard.
 */
export const getAnnotation =
  <T>(key: AnnotationKey, noDefault = true) =>
  (node: SchemaAST.AST): T | undefined => {
    const annotations = resolveAnnotations(node);
    const value = annotations?.[key] as T | undefined;
    if (noDefault && value !== undefined && value === annotations?.identifier) {
      return undefined;
    }
    return value;
  };

/**
 * Recursively descend into AST to find the first matching annotation.
 */
export const findAnnotation = <T>(node: SchemaAST.AST, key: AnnotationKey, noDefault = true): T | undefined => {
  const get = getAnnotation<T>(key, noDefault);
  const value = get(node);
  if (value !== undefined) {
    return value;
  }
  if (isOption(node)) {
    return get((node as SchemaAST.Union).types[0]);
  }
};

//
// Unions.
//

/** `Schema.optional` still produces a `T | undefined` union in v4. */
export const isOption = (node: SchemaAST.AST): boolean =>
  SchemaAST.isUnion(node) && node.types.length === 2 && SchemaAST.isUndefined(node.types[1]);

export const isLiteralUnion = (node: SchemaAST.AST): node is SchemaAST.Union<SchemaAST.Literal> =>
  SchemaAST.isUnion(node) && node.types.length > 0 && node.types.every(SchemaAST.isLiteral);

/**
 * The literal values of a union of literals, or `[]` for any other schema.
 *
 * Narrowed to the schema's own type so `Schema.Union([Schema.Literal('a'), …])` yields `('a' | …)[]`
 * rather than all of `LiteralValue` — callers key React lists by these. The AST erases the literal
 * type, so re-attaching it here is the one place the two can be reconnected.
 */
export const getLiteralValues = <S extends Schema.Top>(
  schema: S,
): ReadonlyArray<S['Type'] & SchemaAST.LiteralValue> => {
  const ast = schema.ast;
  return isLiteralUnion(ast) ? ast.types.map((node) => node.literal as S['Type'] & SchemaAST.LiteralValue) : [];
};

//
// Arrays / tuples.
//

/** An unbounded array: no fixed elements, exactly one rest type. */
export const isArrayType = (node: SchemaAST.AST): node is SchemaAST.Arrays =>
  SchemaAST.isArrays(node) && node.elements.length === 0 && node.rest.length === 1;

export const getArrayElementType = (node: SchemaAST.AST): SchemaAST.AST | undefined =>
  isArrayType(node) ? node.rest[0] : undefined;

export const isArrays = (node: SchemaAST.AST): boolean => SchemaAST.isArrays(node) && node.elements.length > 0;

//
// Discriminated unions.
//

export const isDiscriminatedUnion = (node: SchemaAST.AST): boolean =>
  SchemaAST.isUnion(node) && !!getDiscriminatingProps(node)?.length;

export const getDiscriminatingProps = (node: SchemaAST.AST): string[] | undefined => {
  if (!SchemaAST.isUnion(node) || isOption(node)) {
    return undefined;
  }

  return node.types.reduce<string[]>((shared, type) => {
    const props = getPropertySignatures(type)
      .filter((prop) => SchemaAST.isLiteral(prop.type))
      .map((prop) => prop.name.toString());
    return shared.length === 0 ? props : shared.filter((prop) => props.includes(prop));
  }, []);
};

export const getDiscriminatedType = (
  node: SchemaAST.AST,
  value: Record<string, any> = {},
): SchemaAST.AST | undefined => {
  const props = getDiscriminatingProps(node);
  if (!props?.length || !SchemaAST.isUnion(node)) {
    return undefined;
  }

  for (const type of node.types) {
    const match = getPropertySignatures(type)
      .filter((prop) => props.includes(prop.name.toString()))
      .every((prop) => SchemaAST.isLiteral(prop.type) && prop.type.literal === value[prop.name.toString()]);
    if (match) {
      return type;
    }
  }

  const fields = Object.fromEntries(
    props
      .map((prop) => {
        const literals = node.types
          .map((type) => {
            const found = getPropertySignatures(type).find((candidate) => candidate.name.toString() === prop);
            return found && SchemaAST.isLiteral(found.type) ? found.type.literal : undefined;
          })
          .filter((literal) => literal !== undefined);
        return literals.length ? ([prop, Schema.Literals(literals)] as const) : undefined;
      })
      .filter((entry) => entry !== undefined),
  );

  return Schema.Struct(fields).ast;
};

/**
 * If a property type is optional (T | undefined), return the inner non-undefined node.
 *
 * Applied until the type is no longer optional: v4's `Schema.optional` is not idempotent (it nests
 * as `(T | undefined) | undefined`), which v3's `Schema.partial` over an already-optional field was.
 */
export const unwrapOptional = (type: SchemaAST.AST): SchemaAST.AST => {
  let node = type;
  while (isOption(node)) {
    node = (node as SchemaAST.Union).types[0];
  }
  return node;
};

export const isNestedType = (node: SchemaAST.AST): boolean =>
  SchemaAST.isDeclaration(node) ||
  SchemaAST.isObjectKeyword(node) ||
  node._tag === 'Objects' ||
  isArrays(node) ||
  isDiscriminatedUnion(node);

//
// Mapping.
//

/**
 * Maps AST nodes. The caller is responsible for recursing.
 * NOTE: Will evaluate suspended ASTs.
 */
export const mapAst = (
  ast: SchemaAST.AST,
  f: (ast: SchemaAST.AST, key: PropertyKey | undefined) => SchemaAST.AST,
): SchemaAST.AST => {
  switch (ast._tag) {
    case 'Objects': {
      return new SchemaAST.Objects(
        ast.propertySignatures.map(
          (prop) => new SchemaAST.PropertySignature(prop.name, retainContext(prop.type, f(prop.type, prop.name))),
        ),
        ast.indexSignatures,
        ast.annotations,
        ast.checks,
        ast.encoding,
        ast.context,
      );
    }
    case 'Union': {
      return new SchemaAST.Union(
        ast.types.map((type) => f(type, undefined)),
        ast.mode,
        ast.annotations,
        ast.checks,
        ast.encoding,
        ast.context,
      );
    }
    case 'Arrays': {
      return new SchemaAST.Arrays(
        ast.isMutable,
        ast.elements.map((element, index) => f(element, index)),
        ast.rest.map((rest) => f(rest, undefined)),
        ast.annotations,
        ast.checks,
        ast.encoding,
        ast.context,
      );
    }
    case 'Suspend': {
      const next = f(ast.thunk(), undefined);
      return new SchemaAST.Suspend(() => next, ast.annotations, undefined, ast.encoding, ast.context);
    }
    default: {
      return ast;
    }
  }
};

/**
 * Optionality and mutability ride on `context` in v4, so a mapper that rebuilds a
 * property type must carry the original context across or the key silently becomes required.
 * `SchemaAST.replaceContext` is internal, so this rebuilds through the public key combinators.
 */
export const retainContext = (original: SchemaAST.AST, mapped: SchemaAST.AST): SchemaAST.AST => {
  if (!original.context || mapped.context) {
    return mapped;
  }
  let schema: Schema.Top = Schema.make<Schema.Top>(mapped);
  if (original.context.isOptional) {
    schema = Schema.optionalKey(schema);
  }
  if (original.context.isMutable) {
    schema = Schema.mutableKey(schema);
  }
  return schema.ast;
};
