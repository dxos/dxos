//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import type * as Entity from './Entity';
import * as refInternal from './internal/Ref';
import type * as JsonSchema from './JsonSchema';
import type * as Obj from './Obj';

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
 * const Task = Schema.Struct({
 *   assignee: Ref.Ref(Person),  // Creates a Ref schema
 * }).pipe(Type.object({ typename: 'Task', version: '0.1.0' }));
 * ```
 */
export const Ref: <S extends Schema.Schema.Any>(schema: S) => RefSchema<Schema.Schema.Type<S>> = refInternal.Ref;

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

export const isRef: (value: unknown) => value is Unknown = refInternal.Ref.isRef;

export const make = refInternal.Ref.make;

// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
export const fromDXN = refInternal.Ref.fromDXN;

// TODO(wittjosiah): Factor out?
export const isRefType = (ast: SchemaAST.AST): boolean => {
  return SchemaAST.getAnnotation<JsonSchema.JsonSchema>(ast, SchemaAST.JSONSchemaAnnotationId).pipe(
    Option.flatMap((jsonSchema) => ('$id' in jsonSchema ? Option.some(jsonSchema) : Option.none())),
    Option.flatMap((jsonSchema) => {
      const { typename } = refInternal.getSchemaReference(jsonSchema) ?? {};
      return typename ? Option.some(true) : Option.some(false);
    }),
    Option.getOrElse(() => false),
  );
};
