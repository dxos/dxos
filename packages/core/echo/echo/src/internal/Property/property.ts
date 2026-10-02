//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { SchemaAST, SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { createAnnotationHelper } from '../Annotation/util.ts';
import { type AnyProperties } from '../common/types/index.ts';
import { setValue as setObjectValue } from '../Obj/set-value.ts';

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
  readonly fallback?: (schema: Schema.Top) => Option.Option<Implementation>;
}

/**
 * Two-way implementation: a field accessor (JSON path), or a chain of accessors tried in priority
 * order on read; writes go to the first accessor.
 */
export const PathImplementation = Schema.Struct({
  path: Schema.Union([Schema.String, Schema.Array(Schema.String)]),
});
export interface PathImplementation extends Schema.Schema.Type<typeof PathImplementation> {}

/**
 * One-way (read-only) implementation: a string template whose `{path}` placeholders are field
 * accessors, e.g. `'{first} {last}'`.
 */
export const TemplateImplementation = Schema.Struct({
  template: Schema.String,
});
export interface TemplateImplementation extends Schema.Schema.Type<typeof TemplateImplementation> {}

/**
 * How a specific type implements a property: a lens from the object onto the property value.
 * Plain data, so it is stored in the schema's annotations and survives JSON-schema serialization.
 */
export const Implementation = Schema.Union([PathImplementation, TemplateImplementation]);
export type Implementation = Schema.Schema.Type<typeof Implementation>;

/**
 * Implementations a type provides, keyed by property DXN.
 */
export const ImplementationMap = Schema.Record(Schema.String, Implementation);
export type ImplementationMap = Schema.Schema.Type<typeof ImplementationMap>;

export type MakeProps<T> = {
  /** Fully qualified name, e.g. `org.dxos.property.title`. */
  key: string;
  schema: Schema.Codec<T, any, never>;
  title?: string;
  description?: string;
  normalize?: (value: unknown) => T | undefined;
  fallback?: (schema: Schema.Top) => Option.Option<Implementation>;
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

const PropertiesAnnotation = createAnnotationHelper<ImplementationMap>(PropertiesAnnotationId);

const getImplementations = (ast: SchemaAST.AST): ImplementationMap =>
  PropertiesAnnotation.getFromAst(ast).pipe(Option.getOrElse(() => ({})));

/**
 * Attaches an implementation of `property` to a schema.
 * Apply to the source schema before `Type.makeObject` / `Type.makeRelation`.
 */
export const implement =
  <T>(property: Property<T>, implementation: Implementation) =>
  <S extends Schema.Top>(schema: S): S =>
    PropertiesAnnotation.set({ ...getImplementations(schema.ast), [property.dxn]: implementation })(schema);

/**
 * Resolves the implementation of `property` on a schema: explicit, else the property's fallback.
 */
export const getImplementation = <T>(schema: Schema.Top, property: Property<T>): Option.Option<Implementation> => {
  const implementation: Implementation | undefined = getImplementations(schema.ast)[property.dxn];
  if (implementation) {
    return Option.some(implementation);
  }
  return property.fallback?.(schema) ?? Option.none();
};

export const isPathImplementation = (implementation: Implementation): implementation is PathImplementation =>
  'path' in implementation;

const toPaths = (path: PathImplementation['path']): readonly string[] => (typeof path === 'string' ? [path] : path);

/**
 * Returns the field accessors of a path implementation, or an empty list for a template.
 */
export const getPaths = (implementation: Implementation): readonly string[] =>
  isPathImplementation(implementation) ? toPaths(implementation.path) : [];

const isRecord = (value: unknown): value is AnyProperties => typeof value === 'object' && value !== null;

// Root-prefixed paths (`$.name`) predate `JsonPath` validation and may sit in persisted schemas; an empty
// path names the object itself, which is neither a field to read nor one to write.
const toJsonPath = (path: string): SchemaEx.JsonPath | undefined => {
  const relative = path.startsWith('$.') ? path.slice(2) : path;
  return relative.length > 0 && SchemaEx.isJsonPath(relative) ? relative : undefined;
};

/**
 * Whether the implementation can write the property back onto the object; templates are one-way.
 */
export const isWritable = (implementation: Implementation): boolean => {
  if (!isPathImplementation(implementation)) {
    return false;
  }
  const [path] = toPaths(implementation.path);
  return path !== undefined && toJsonPath(path) !== undefined;
};

// An unreadable path counts as absent so a bad annotation cannot throw from a label render.
const readPath = (object: AnyProperties, path: string): unknown => {
  const jsonPath = toJsonPath(path);
  return jsonPath === undefined ? undefined : SchemaEx.getField(object, jsonPath);
};

const TEMPLATE_PLACEHOLDER = /\{([^{}]+)\}/g;

// Unset placeholders render empty so `'{first} {last}'` still reads `'Ada'` without a last name.
const renderTemplate = (object: AnyProperties, template: string): string =>
  template
    .replace(TEMPLATE_PLACEHOLDER, (_match, path: string) => {
      const value = readPath(object, path.trim());
      switch (typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'bigint':
          return String(value);
        default:
          return '';
      }
    })
    .trim();

/**
 * Reads `property` from `object` through the schema's implementation.
 */
export const getWithSchema = <T>(schema: Schema.Top, property: Property<T>, object: unknown): T | undefined => {
  const implementation = getImplementation(schema, property);
  if (Option.isNone(implementation) || !isRecord(object)) {
    return undefined;
  }

  if (!isPathImplementation(implementation.value)) {
    return property.normalize(renderTemplate(object, implementation.value.template));
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
 * @returns false if the schema does not implement the property or implements it with a template.
 */
export const setWithSchema = <T>(
  schema: Schema.Top,
  property: Property<T>,
  object: AnyProperties,
  value: T,
): boolean => {
  const implementation = getImplementation(schema, property);
  if (Option.isNone(implementation) || !isPathImplementation(implementation.value)) {
    return false;
  }

  const [path] = toPaths(implementation.value.path);
  const jsonPath = path === undefined ? undefined : toJsonPath(path);
  if (jsonPath === undefined) {
    return false;
  }

  const segments = SchemaEx.splitJsonPath(jsonPath);
  if (segments.length === 1) {
    object[segments[0]] = value;
  } else {
    // Absent parents are built from the schema; a bare `{}` would fail validation of their required fields.
    setObjectValue(object, segments, value);
  }
  return true;
};
