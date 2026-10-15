//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import * as SchemaAST from '@dxos/effect/SchemaAST';
import { DXN, type URI } from '@dxos/keys';

import type * as Entity from './Entity.ts';
import { ReferenceAnnotationId } from './internal/Annotation/index.ts';
import { snapshotEquals } from './internal/common/atom-snapshot.ts';
import type * as internal from './internal/index.ts';
import * as refInternal from './internal/Ref/index.ts';
import type * as JsonSchema from './JsonSchema.ts';
import type * as Obj from './Obj.ts';
import type * as Relation from './Relation.ts';
// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Type$ from './Type.ts';

/**
 * Instance type for a reference.
 *
 * Reference can point to any object or relation.
 * References are lazy loaded.
 *
 * `ref.dxn` is the DXN of the referenced object.
 *
 * @example
 * ```ts
 * const taskRef: Ref<Task> = Ref.make(task);
 *
 * await taskRef.load(); // Returns Promise<Task>
 * yield* Database.load(taskRef); // Effectful version.
 *
 * database.makeRef(dxn); // Create a ref from a DXN.
 * ```
 */
export type Ref<T> = refInternal.Ref<T>;
export type Unknown = refInternal.Ref<Obj.Unknown>;

/**
 * Factory function to create a Ref schema for the given target schema.
 * Use this in schema definitions to declare reference fields.
 *
 * @example
 * ```ts
 * class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
 *   Schema.Struct({
 *     assignee: Ref.Ref(Person),  // Creates a Ref schema
 *   }),
 * ) {}
 * ```
 *
 * @performance O(1) per call at schema-definition time; reads the target type annotation.
 */
export const Ref: {
  <S extends Type$.AnyObj>(type: S): RefSchema<Type$.InstanceType<S> & Obj.Unknown>;

  // Relations are entities too and can be referenced. The instance type already
  // carries the relation kind brand, so intersect with `Relation.Unknown` (not
  // `Obj.Unknown`, whose object kind brand conflicts and collapses to `never`).
  <S extends Type$.AnyRelation>(type: S): RefSchema<Type$.InstanceType<S> & Relation.Unknown>;

  // `Type.Type` entities (the meta-schema kind) can be referenced too — e.g. a
  // trigger that points to a stored function/workflow definition.
  <T extends Type$.Type<any>>(type: T): RefSchema<Type$.InstanceType<T>>;

  // Schema-side overload for the well-known "any object" / "any relation" schemas.
  // Other raw `Schema.Schema` values are intentionally rejected — callers should
  // pass a `Type.Type` entity instead.
  <S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema.Schema.Type<S> & Obj.Unknown>;
} = refInternal.Ref as any;

/**
 * Helpers for arrays of refs.
 *
 * @performance O(n) in the number of refs for each helper; `targets` reads each ref target synchronously.
 */
export const Array = refInternal.RefArray;

/**
 * TypeScript type for a Ref schema.
 * This is the type of the SCHEMA itself, not the runtime ref instance.
 * For the instance type, use `Ref.Ref<T>` from the Ref module.
 *
 * @example
 * ```ts
 * // Schema type annotation (rarely needed, usually inferred):
 * const refSchema: Ref.RefSchema<typeof Task> = Ref.Ref(Task);
 *
 * // Instance type annotation (use Ref.Ref instead):
 * const refInstance: Ref.Ref<Task> = Ref.make(task);
 * ```
 */
// TODO(dmaretskyi): Investigate if we can remove this type.
//                   Post DX-836 it will become just `Schema.Schema<Ref.Ref<T>>`.
//                   NOTE: This could be Type.Ref<T> instead, but since it going to be removed, it's better to keep it here, self-contained.
export interface RefSchema<T extends Entity.Unknown> extends refInternal.RefSchema<T> {}

/**
 * Extract reference target.
 */
export type Target<R extends Unknown> = R extends refInternal.Ref<infer T> ? T : never;

/**
 * Reference resolver.
 */
export type Resolver = refInternal.RefResolver;

/**
 * Type guard for refs.
 *
 * @performance O(1) brand check; no allocation.
 */
export const isRef: (value: unknown) => value is Unknown = refInternal.Ref.isRef;

/**
 * Whether a schema identifier names a ref declaration.
 *
 * A JSON-schema generator's default reference policy hoists anything carrying an identifier into
 * `$defs`; generators that must keep refs inline decline exactly these.
 *
 * @performance O(1) prefix check.
 */
export const isRefIdentifier: (identifier: string | undefined) => boolean = refInternal.isRefIdentifier;

/**
 * Create a reference to an entity.
 *
 * @performance O(1); allocates a ref that inlines the target, with no lookup.
 */
export const make = refInternal.Ref.make;

// TODO(dmaretskyi): Consider just allowing `make` to accept URI.
/**
 * Create an unresolved reference from a URI.
 *
 * @performance O(1); allocates an unresolved ref with no resolver, so it cannot load until bound.
 */
export const fromURI = (uri: URI.URI): refInternal.Ref<any> => refInternal.Ref.fromURI(uri);

/**
 * Create a predicate that tests whether a ref points to the given entity id.
 *
 * @performance O(1) per call of the returned predicate (parses the ref URI).
 */
export const hasEntityId = refInternal.Ref.hasEntityId;

/**
 * Whether two refs, or two ref arrays element by element, point at the same target: the same URI and the same
 * inlined target. Every read of a ref property mints a new wrapper, so identity never matches.
 *
 * @performance O(n) in the array length; no allocation.
 */
export const equals: (a: Ref<any> | readonly Ref<any>[], b: Ref<any> | readonly Ref<any>[]) => boolean = snapshotEquals;

/**
 * Disposition of a deleted target. Defaults to `'exclude'`, matching the query option.
 */
export type LoadOptions = refInternal.LoadOptions;

/**
 * Loads the targets of `refs` in ref order, omitting missing targets and, unless
 * `{ deleted: 'include' }` asks for them, deleted ones.
 *
 * @performance Async; issues every `tryLoad` concurrently, O(n) in refs.
 */
export const loadAll: <T>(refs: readonly Ref<T>[], options?: LoadOptions) => Promise<T[]> = refInternal.loadAll;

/**
 * The URI a reference property points at, or `undefined` when the node is not a reference.
 *
 * A reference declares its target twice: as a typed annotation on the declaration and as the JSON
 * schema keys on the encoded node. Effect 4 dropped the merged `jsonSchema` annotation this used to
 * read, so both are consulted -- a schema rebuilt from stored JSON only carries the latter.
 *
 * Typed as `URI` rather than `DXN`: a static schema's target is a typename DXN, but a stored
 * (dynamic) schema is identified by its `echo:` EID, so callers must narrow before assuming either.
 *
 * @performance O(1) annotation read, falling back to an O(schema size) encoded-side walk.
 */
export const getReferenceTarget = (ast: SchemaAST.AST): URI.URI | undefined => {
  const reference = SchemaAST.getAnnotation<{ typename?: string; version?: string }>(ast, ReferenceAnnotationId);
  if (reference?.typename) {
    return DXN.make(reference.typename, reference.version);
  }
  const encoded = SchemaAST.resolveAnnotations(SchemaAST.toEncoded(ast));
  return encoded === undefined ? undefined : refInternal.getSchemaReferenceDXN(encoded as JsonSchema.JsonSchema);
};

// TODO(wittjosiah): Factor out?
/**
 * Whether the AST node is a reference.
 *
 * @performance O(1) annotation read, falling back to an O(schema size) encoded-side walk.
 */
export const isRefType = (ast: SchemaAST.AST): boolean => getReferenceTarget(ast) !== undefined;
