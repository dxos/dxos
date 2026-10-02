//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { SchemaAST, SchemaEx } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { createAnnotationHelper } from '../Annotation/util.ts';
import { type AnyProperties } from '../common/types/index.ts';

export const PropertyTypeId = '~@dxos/echo/Property' as const;
export type PropertyTypeId = typeof PropertyTypeId;

/**
 * A type-independent property: identified by a DXN, with a value schema and descriptive metadata.
 * Types opt in by attaching an {@link Implementation} that maps the property onto their own fields.
 */
export interface Property<T> {
  readonly [PropertyTypeId]: PropertyTypeId;

  /** Globally unique identifier, e.g. `dxn:org.dxos.property.title`. */
  readonly dxn: DXN.DXN;

  /** Schema of the property value. */
  readonly schema: Schema.Codec<T, any, never>;

  /** Human-readable name. */
  readonly title?: string;

  /** Human-readable description. */
  readonly description?: string;

  /**
   * Converts a raw field value to a property value, or `undefined` to treat it as absent so that a
   * path chain falls through to its next entry.
   */
  readonly normalize: (value: unknown) => T | undefined;

  /**
   * Implementation used when the schema carries none for this property, e.g. one derived from a
   * legacy annotation that predates the property.
   */
  readonly fallback?: (schema: Schema.Top) => Option.Option<Implementation<T>>;
}

/**
 * Two-way, serializable implementation: a field accessor (JSON path), or a chain of accessors tried
 * in priority order on read; writes go to the first accessor.
 */
export type PathImplementation = {
  readonly path: string | readonly string[];
};

/**
 * Computed implementation: one-way when `set` is omitted (derived/read-only), two-way otherwise.
 * Functions cannot be serialized, so this form is only available to static schemas.
 */
export type ComputedImplementation<T> = {
  readonly get: (object: AnyProperties) => T | undefined;
  readonly set?: (object: AnyProperties, value: T) => void;
};

/**
 * How a specific type implements a property: a lens from the object onto the property value.
 */
export type Implementation<T> = PathImplementation | ComputedImplementation<T>;

export type MakeProps<T> = {
  /** Fully qualified name, e.g. `org.dxos.property.title`. */
  key: string;
  schema: Schema.Codec<T, any, never>;
  title?: string;
  description?: string;
  normalize?: (value: unknown) => T | undefined;
  fallback?: (schema: Schema.Top) => Option.Option<Implementation<T>>;
};

/**
 * Defines a property.
 */
export const make = <T>({ key, schema, title, description, normalize, fallback }: MakeProps<T>): Property<T> => {
  const is = Schema.is(schema);
  return {
    [PropertyTypeId]: PropertyTypeId,
    dxn: DXN.make(key),
    schema,
    title,
    description,
    normalize: normalize ?? ((value) => (is(value) ? value : undefined)),
    fallback,
  };
};

export const isProperty = (value: unknown): value is Property<unknown> =>
  typeof value === 'object' && value !== null && PropertyTypeId in value;

/**
 * Schema annotation holding the implementations a type provides, keyed by property DXN.
 */
export const PropertiesAnnotationId = '~@dxos/echo/annotation/Properties';

type ImplementationMap = Readonly<Record<string, Implementation<any>>>;

const PropertiesAnnotation = createAnnotationHelper<ImplementationMap>(PropertiesAnnotationId);

const getImplementations = (ast: SchemaAST.AST): ImplementationMap =>
  PropertiesAnnotation.getFromAst(ast).pipe(Option.getOrElse(() => ({})));

/**
 * Attaches an implementation of `property` to a schema.
 * Apply to the source schema before `Type.makeObject` / `Type.makeRelation`.
 */
export const implement =
  <T>(property: Property<T>, implementation: Implementation<T>) =>
  <S extends Schema.Top>(schema: S): S =>
    PropertiesAnnotation.set({ ...getImplementations(schema.ast), [property.dxn]: implementation })(schema);

/**
 * Resolves the implementation of `property` on a schema: explicit, else the property's fallback.
 */
export const getImplementation = <T>(schema: Schema.Top, property: Property<T>): Option.Option<Implementation<T>> => {
  const implementation: Implementation<T> | undefined = getImplementations(schema.ast)[property.dxn];
  if (implementation) {
    return Option.some(implementation);
  }
  return property.fallback?.(schema) ?? Option.none();
};

export const isPathImplementation = <T>(implementation: Implementation<T>): implementation is PathImplementation =>
  'path' in implementation;

const toPaths = (path: PathImplementation['path']): readonly string[] => (typeof path === 'string' ? [path] : path);

/**
 * Returns the field accessors of a path implementation, or an empty list for a computed one.
 */
export const getPaths = <T>(implementation: Implementation<T>): readonly string[] =>
  isPathImplementation(implementation) ? toPaths(implementation.path) : [];

/**
 * Whether the implementation can write the property back onto the object.
 */
export const isWritable = <T>(implementation: Implementation<T>): boolean =>
  isPathImplementation(implementation) ? toPaths(implementation.path).length > 0 : implementation.set != null;

const isRecord = (value: unknown): value is AnyProperties => typeof value === 'object' && value !== null;

const readPath = (object: AnyProperties, path: string): unknown => {
  assertArgument(SchemaEx.isJsonPath(path), 'path', `Invalid property path: ${path}`);
  return SchemaEx.getField(object, path);
};

/**
 * Reads `property` from `object` through the schema's implementation.
 */
export const getWithSchema = <T>(schema: Schema.Top, property: Property<T>, object: unknown): T | undefined => {
  const implementation = getImplementation(schema, property);
  if (Option.isNone(implementation) || !isRecord(object)) {
    return undefined;
  }

  if (!isPathImplementation(implementation.value)) {
    return property.normalize(implementation.value.get(object));
  }

  for (const path of toPaths(implementation.value.path)) {
    const value = property.normalize(readPath(object, path));
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

/**
 * Writes `property` onto `object` through the schema's implementation.
 * Must be called within an `Obj.update` / `Relation.update` callback.
 *
 * @returns false if the schema does not implement the property or the implementation is one-way.
 */
export const setWithSchema = <T>(
  schema: Schema.Top,
  property: Property<T>,
  object: AnyProperties,
  value: T,
): boolean => {
  const implementation = getImplementation(schema, property);
  if (Option.isNone(implementation) || !isWritable(implementation.value)) {
    return false;
  }

  if (!isPathImplementation(implementation.value)) {
    implementation.value.set?.(object, value);
    return true;
  }

  const [path] = toPaths(implementation.value.path);
  assertArgument(SchemaEx.isJsonPath(path), 'path', `Invalid property path: ${path}`);
  SchemaEx.setValue(object, path, value);
  return true;
};
