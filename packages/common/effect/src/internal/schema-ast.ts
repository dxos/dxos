//
// Copyright 2026 DXOS.org
//
// Compatibility layer over `effect/SchemaAST`.
//
// Effect 4 keeps only nine of that module's 138 exports public and reshapes the AST itself
// (`TypeLiteral` -> `Objects`, `TupleType` -> `Arrays`, `Refinement` -> `checks`, symbol
// annotation ids -> string keys). Routing every importer through here means the rename lands in
// one module instead of eighty, and lets call sites keep the v3 spelling where the v4 concept is
// the same thing under a new name.
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

// Nodes and guards whose v4 names differ only in spelling.
export {
  type AST,
  Arrays,
  Arrays as TupleType,
  Declaration,
  IndexSignature,
  Literal,
  type LiteralValue,
  Objects,
  Objects as TypeLiteral,
  PropertySignature,
  Suspend,
  Union,
  isAny as isAnyKeyword,
  isArrays as isTupleType,
  isBoolean as isBooleanKeyword,
  isDeclaration,
  isEnum as isEnums,
  isLiteral,
  isNever as isNeverKeyword,
  isNumber as isNumberKeyword,
  isObjectKeyword,
  isObjects as isTypeLiteral,
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
  toEncoded as encodedBoundAST,
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

/**
 * Annotation ids are plain string keys in v4. Keeping the v3 names as constants lets the ~40
 * call sites that pass `SchemaAST.TitleAnnotationId` carry over untouched.
 */
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
 */
export const resolveAnnotations = (ast: SchemaAST.AST): Annotations | undefined => SchemaAST.resolve(ast);

/** `SchemaAST.annotate(ast, ...)` is internal in v4; the `Schema` wrapper is public. */
export const annotations = (ast: SchemaAST.AST, annotations: Annotations): SchemaAST.AST =>
  Schema.make<Schema.Top>(ast).annotate(annotations).ast;

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

/** v3 returned an `Option`; v4 annotations are a plain record, so this returns the value. */
export const getAnnotation =
  <T>(key: string) =>
  (ast: SchemaAST.AST): T | undefined =>
    resolveAnnotations(ast)?.[key] as T | undefined;
