//
// Copyright 2026 DXOS.org
//
// Facade over `effect/SchemaAST`, which keeps only a fraction of its exports public; the helpers
// below fill the gaps (annotation resolution, `omit`/`pick`, suspend unwrapping).
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

// Nodes and guards re-exported under their v4 names; the `*Keyword` aliases disambiguate the
// bare `isAny`/`isString` guards from value-level checks at call sites.
export {
  Arrays,
  type AST,
  type Check,
  type Checks,
  Declaration,
  IndexSignature,
  Literal,
  type LiteralValue,
  Objects,
  PropertySignature,
  Suspend,
  Union,
  toEncoded as encodedBoundAST,
  isAny as isAnyKeyword,
  isArrays,
  isBoolean as isBooleanKeyword,
  isDeclaration,
  isEnum as isEnums,
  isLiteral,
  isNever as isNeverKeyword,
  isNumber as isNumberKeyword,
  isObjectKeyword,
  isObjects,
  isOptional,
  isString as isStringKeyword,
  isSuspend,
  isSymbol as isSymbolKeyword,
  isUndefined as isUndefinedKeyword,
  isUnion,
  isUnknown as isUnknownKeyword,
  objectKeyword,
  resolve,
  toEncoded,
  toType,
} from 'effect/SchemaAST';

export {
  any as anyKeyword,
  boolean as booleanKeyword,
  never as neverKeyword,
  number as numberKeyword,
  string as stringKeyword,
  unknown as unknownKeyword,
} from 'effect/SchemaAST';

export type Annotations = Schema.Annotations.Annotations;

/** Annotation ids are plain string keys; named constants keep the ~40 call sites typo-safe. */
export const TitleAnnotationId = 'title';
export const DescriptionAnnotationId = 'description';
export const ExamplesAnnotationId = 'examples';
export const IdentifierAnnotationId = 'identifier';
export const DefaultAnnotationId = 'default';
export const JSONSchemaAnnotationId = 'toJsonSchema';

/**
 * Annotating a node that carries checks attaches to the last check rather than the node, and the
 * resolver reads back only that check, so every read must go through here or annotations on
 * refined types silently vanish.
 *
 * The node's own annotations are layered underneath for the mirror-image case — annotated first,
 * `Schema.check`ed after — which `SchemaAST.resolve` drops entirely.
 */
export const resolveAnnotations = (ast: SchemaAST.AST): Annotations | undefined => {
  const resolved = SchemaAST.resolve(ast);
  if (resolved === undefined || resolved === ast.annotations || ast.annotations === undefined) {
    return resolved ?? ast.annotations;
  }
  return { ...ast.annotations, ...resolved };
};

/** `SchemaAST.annotate(ast, ...)` is internal in v4; the `Schema` wrapper is public. */
export const annotate = (ast: SchemaAST.AST, annotations: Annotations): SchemaAST.AST =>
  Schema.make<Schema.Top>(ast).annotate(annotations).ast;

/**
 * Drops the named properties from an object node.
 *
 * v4 removed the AST-level `omit`; `Objects` is rebuilt directly because the `Schema`-level
 * equivalent needs the key literals at the type level, which a runtime name list cannot supply.
 */
export const omit = (ast: SchemaAST.AST, names: ReadonlyArray<PropertyKey>): SchemaAST.AST => {
  const node = unwrapSuspend(ast);
  if (node._tag !== 'Objects') {
    return ast;
  }
  const dropped = new Set(names);
  return new SchemaAST.Objects(
    node.propertySignatures.filter((property) => !dropped.has(property.name)),
    node.indexSignatures,
    node.annotations,
    node.checks,
    node.encoding,
    node.context,
    node.encodingChecks,
  );
};

/**
 * Keeps only the named properties of an object node.
 *
 * The mirror of {@link omit}, and needed for the same reason: `mapFields(Struct.pick(...))` wants
 * the key literals at the type level, which a runtime name list cannot supply.
 */
export const pick = (ast: SchemaAST.AST, names: ReadonlyArray<PropertyKey>): SchemaAST.AST => {
  const node = unwrapSuspend(ast);
  if (node._tag !== 'Objects') {
    return ast;
  }
  const kept = new Set(names);
  return new SchemaAST.Objects(
    node.propertySignatures.filter((property) => kept.has(property.name)),
    node.indexSignatures,
    node.annotations,
    node.checks,
    node.encoding,
    node.context,
    node.encodingChecks,
  );
};

/**
 * Merges another object node's properties in, the later declaration winning on a name clash.
 *
 * v4 removed `Schema.extend`; its replacement (`fieldsAssign`) needs both sides' fields at the type
 * level, which a schema known only as a `Codec` cannot supply. Non-object nodes are returned as-is
 * rather than throwing, matching {@link omit}.
 */
export const assignFields = (ast: SchemaAST.AST, other: SchemaAST.AST): SchemaAST.AST => {
  const node = unwrapSuspend(ast);
  const source = unwrapSuspend(other);
  if (node._tag !== 'Objects' || source._tag !== 'Objects') {
    return ast;
  }
  const added = new Set(source.propertySignatures.map((property) => property.name));
  return new SchemaAST.Objects(
    [...node.propertySignatures.filter((property) => !added.has(property.name)), ...source.propertySignatures],
    [...node.indexSignatures, ...source.indexSignatures],
    node.annotations,
    node.checks,
    node.encoding,
    node.context,
    node.encodingChecks,
  );
};

/** `SchemaAST.isMutable` is internal in v4. */
export const isMutable = (ast: SchemaAST.AST): boolean => ast.context?.isMutable ?? false;

/** v4 dropped the top-level accessor; `Objects` carries the signatures directly. */
export const getPropertySignatures = (ast: SchemaAST.AST): ReadonlyArray<SchemaAST.PropertySignature> => {
  const node = unwrapSuspend(ast);
  return node._tag === 'Objects' ? node.propertySignatures : [];
};

export const getIndexSignatures = (ast: SchemaAST.AST): ReadonlyArray<SchemaAST.IndexSignature> => {
  const node = unwrapSuspend(ast);
  return node._tag === 'Objects' ? node.indexSignatures : [];
};

const unwrapSuspend = (ast: SchemaAST.AST): SchemaAST.AST =>
  SchemaAST.isSuspend(ast) ? unwrapSuspend(ast.thunk()) : ast;

/** Refinements are `Check`s attached to the node in v4 rather than a wrapper node. */
export const getChecks = (ast: SchemaAST.AST): ReadonlyArray<SchemaAST.Check<any>> => ast.checks ?? [];

/** There is no `Refinement` node in v4; a node either carries checks or it does not. */
export const isRefinement = (ast: SchemaAST.AST): boolean => (ast.checks?.length ?? 0) > 0;

/** Transformations are an encoding chain in v4 rather than a node kind. */
export const isTransformation = (ast: SchemaAST.AST): boolean => ast.encoding !== undefined;

const annotationGetter =
  (key: string) =>
  (ast: SchemaAST.AST): unknown =>
    resolveAnnotations(ast)?.[key];

export const getTitleAnnotation = annotationGetter(TitleAnnotationId);
export const getDescriptionAnnotation = annotationGetter(DescriptionAnnotationId);
export const getIdentifierAnnotation = annotationGetter(IdentifierAnnotationId);
export const getDefaultAnnotation = annotationGetter(DefaultAnnotationId);
export const getJSONSchemaAnnotation = annotationGetter(JSONSchemaAnnotationId);

/**
 * Reads one annotation by key.
 *
 * v3 returned an `Option`; v4 annotations are a plain record, so this returns the value or
 * `undefined`. Dual like the Effect APIs it replaces, since call sites use both orders.
 */
export const getAnnotation: {
  <T>(key: string): (ast: SchemaAST.AST) => T | undefined;
  <T>(ast: SchemaAST.AST, key: string): T | undefined;
} = (<T>(...args: [string] | [SchemaAST.AST, string]) => {
  if (args.length === 2) {
    const [ast, key] = args;
    return resolveAnnotations(ast)?.[key] as T | undefined;
  }
  const [key] = args;
  return (ast: SchemaAST.AST): T | undefined => resolveAnnotations(ast)?.[key] as T | undefined;
}) as typeof getAnnotation;
