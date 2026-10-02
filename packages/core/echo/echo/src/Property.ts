//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import type * as Entity from './Entity.ts';
import { getSchema } from './internal/common/types/index.ts';
import * as internal from './internal/Property/index.ts';

/**
 * A type-independent property: identified by a DXN, with a value schema and metadata.
 * Specific types implement it via a lens onto their own fields (see {@link implement}).
 */
export type Property<T> = internal.Property<T>;

/**
 * How a type implements a property:
 * - `{ path }` — two-way, serializable; a field accessor or a priority-ordered chain of them.
 * - `{ get, set? }` — computed; one-way (read-only) without `set`. Static schemas only.
 */
export type Implementation<T> = internal.Implementation<T>;

export type MakeProps<T> = internal.MakeProps<T>;

/**
 * Defines a property.
 *
 * @example
 * ```ts
 * const Due = Property.make({ key: 'org.dxos.property.due', schema: Schema.String, title: 'Due date' });
 * ```
 *
 * @performance O(1).
 */
export const make: <T>(props: MakeProps<T>) => Property<T> = internal.make;

export const isProperty = internal.isProperty;

/**
 * Attaches an implementation of a property to a type's schema.
 * Apply to the source schema before `Type.makeObject` / `Type.makeRelation`.
 *
 * @example
 * ```ts
 * const Person = Schema.Struct({ first: Schema.String, last: Schema.String }).pipe(
 *   Property.implement(Property.Title, { get: (person) => `${person.first} ${person.last}` }),
 *   Type.makeObject(...),
 * );
 * ```
 *
 * @performance O(implemented properties); copies the schema's implementation map.
 */
export const implement: <T>(
  property: Property<T>,
  implementation: Implementation<T>,
) => <S extends Schema.Top>(schema: S) => S = internal.implement;

/**
 * Resolves a schema's implementation of a property (explicit, else the property's fallback).
 *
 * @performance O(1) annotation lookup.
 */
export const getImplementation: <T>(schema: Schema.Top, property: Property<T>) => Option.Option<Implementation<T>> =
  internal.getImplementation;

/**
 * Reads a property from an entity (or snapshot) through its type's implementation.
 *
 * @performance O(path accessors) for a path implementation; the cost of `get` for a computed one.
 */
export const get: {
  <T>(property: Property<T>): (entity: Entity.Unknown | Entity.Snapshot) => T | undefined;
  <T>(entity: Entity.Unknown | Entity.Snapshot, property: Property<T>): T | undefined;
} = Function.dual(2, <T>(entity: Entity.Unknown | Entity.Snapshot, property: Property<T>): T | undefined => {
  const schema = getSchema(entity);
  return schema != null ? internal.getWithSchema(schema, property, entity) : undefined;
});

/**
 * Writes a property onto an entity through its type's implementation.
 * Must be called within an `Obj.update` / `Relation.update` callback.
 *
 * @returns false if the type does not implement the property or implements it one-way.
 * @performance O(path depth) for a path implementation; the cost of `set` for a computed one.
 */
export const set = <T>(entity: Entity.Mutable<Entity.Unknown>, property: Property<T>, value: T): boolean => {
  const schema = getSchema(entity);
  return schema != null ? internal.setWithSchema(schema, property, entity, value) : false;
};

/**
 * Whether the entity's type implements the property two-way.
 *
 * @performance O(1) annotation lookup.
 */
export const isWritable = <T>(entity: Entity.Unknown | Entity.Snapshot, property: Property<T>): boolean => {
  const schema = getSchema(entity);
  return schema != null && Option.exists(internal.getImplementation(schema, property), internal.isWritable);
};

/**
 * The display title of an entity; backs `Obj.getLabel` / `Obj.setLabel`.
 * Types without an explicit implementation resolve it from `Annotation.LabelAnnotation`, else `name`.
 */
export const Title: Property<string> = internal.Title;
