//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export {
  DescriptionAnnotation,
  FormInputAnnotation,
  FormInlineAnnotation,
  GeneratorAnnotation,
  LabelAnnotation,
  ReferenceAnnotation,
  HiddenAnnotation,
  TypeAnnotation,
  getDescriptionWithSchema,
  getLabelWithSchema,
  getTypeAnnotation,
  setDescriptionWithSchema,
  setLabelWithSchema,
  IconAnnotation,
  IconFromRefAnnotation,
} from './internal/Annotation';

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as Types from 'effect/Types';

import * as Entity from './Entity';
import * as internalAnnotations from './internal/Annotation';

export const TypeId = '~@dxos/echo/Annotation' as const;
export type TypeId = typeof TypeId;

// TODO(dmaretskyi): Reconcile different get/set styles: mutate in-place, return.
// TODO(dmaretskyi): Reconcile Annotation methods vs static functions.
// TODO(dmaretskyi): Reconcile Annotation.Key vs DXN -- work-out approach to versioning.

/**
 * Annotation is a typed property that can be assigned to a schema or an entity instance.
 */
export interface Annotation<T> {
  [TypeId]: {
    _Type: T;
  };

  // TODO(dmaretskyi): Make this a DXN?
  /**
   * Unique fully-qualified identifier for the annotation.
   * @example "org.dxos.annotation.color"
   */
  readonly key: Key;

  /**
   * Schema of the annotation value.
   */
  readonly schema: Schema.Schema<T, unknown, never>;

  /**
   * Get the annotation value from an Effect schema.
   *
   * Only accepts `Schema.Schema.Any` — to read an annotation off a `Type.Type`
   * entity, unwrap it first with `Type.getSchema(entity)`. This keeps the
   * annotation pipeline single-shaped and forces annotations to live on the
   * source schema, not on the post-construction Type entity.
   */
  get: (schema: Schema.Schema.Any) => Option.Option<T>;
  /**
   * Get the annotation value from the AST.
   */
  getFromAst: (ast: SchemaAST.AST) => Option.Option<T>;
  /**
   * Set the annotation on an Effect schema.
   *
   * Only accepts `Schema.Schema.Any` — annotations must be applied to the
   * source schema BEFORE wrapping it with `Type.makeObject` / `Type.makeRelation`.
   * In a pipe, place every `Annotation.X.set(...)` before the `Type.make...` step.
   */
  set: (value: T) => <S extends Schema.Schema.Any>(schema: S) => S;
}

export const Key = internalAnnotations.Key;
export type Key = Schema.Schema.Type<typeof Key>;

interface MakeProps<T> {
  id: string;
  schema: Schema.Schema<T, any, never>;
}

/**
 * Create a new schema annotation.
 * Annotation can be assigned both to fields and to the schema itself.
 * Annotation is serialized with the schema.
 *
 * @example
 * ```ts
 * const ColorAnnotation = Annotation.make({
 *   id: 'org.dxos.annotation.color',
 *   schema: Schema.String,
 * });
 *
 * const schema = Schema.String.annotations(ColorAnnotation.set('red'));
 * ```
 */
export const make: <T>(props: MakeProps<T>) => Annotation<T> = internalAnnotations.makeUserAnnotation;

/**
 * Get the value of an annotation from an entity instance or snapshot.
 * For schema-level reads use the annotation instance method (e.g. `ColorAnnotation.get(schema)`).
 * For getting an annotation value from a dictionary, use `getDictionary`.
 */
export const get: {
  <T>(annotation: Annotation<T>): (target: Entity.Unknown | Entity.Snapshot) => Option.Option<T>;
  <T>(target: Entity.Unknown | Entity.Snapshot, annotation: Annotation<T>): Option.Option<T>;
} = Function.dual<
  <T>(annotation: Annotation<T>) => (target: Entity.Unknown | Entity.Snapshot) => Option.Option<T>,
  <T>(target: Entity.Unknown | Entity.Snapshot, annotation: Annotation<T>) => Option.Option<T>
>(2, (target, annotation) => {
  return internalAnnotations.get(target, annotation);
});

/**
 * Set the value of an annotation on an entity instance.
 * For schema-level writes use the annotation instance method (e.g. `ColorAnnotation.set('red')`).
 * For setting an annotation value on a dictionary, use `setDictionary`.
 */
export const set: {
  <T>(annotation: Annotation<T>, value: T): (target: Entity.Mutable<Entity.Unknown>) => void;
  <T>(target: Entity.Mutable<Entity.Unknown>, annotation: Annotation<T>, value: T): void;
} = Function.dual<
  <T>(annotation: Annotation<T>, value: T) => (target: Entity.Mutable<Entity.Unknown>) => void,
  <T>(target: Entity.Mutable<Entity.Unknown>, annotation: Annotation<T>, value: T) => void
>(3, (target, annotation, value) => {
  return internalAnnotations.set(target, annotation, value);
});

export const getFromAst: {
  <T>(annotation: Annotation<T>): (ast: SchemaAST.AST) => Option.Option<T>;
  <T>(ast: SchemaAST.AST, annotation: Annotation<T>): Option.Option<T>;
} = Function.dual<
  <T>(annotation: Annotation<T>) => (ast: SchemaAST.AST) => Option.Option<T>,
  <T>(ast: SchemaAST.AST, annotation: Annotation<T>) => Option.Option<T>
>(2, (ast, annotation) => {
  return internalAnnotations.getFromAst(ast, annotation);
});

/**
 * Set of annotation values.
 *
 * Can be used inside an object/relation schema:
 *
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 *   extensions: Annotation.Dictionary,
 * });
 * ```
 */
export const Dictionary = internalAnnotations.Dictionary;
export interface Dictionary extends Schema.Schema.Type<typeof Dictionary> {}

/**
 * Get the value of an annotation from a Dictionary.
 */
export const getDictionary: {
  <T>(annotation: Annotation<T>): (values: Dictionary) => Option.Option<T>;
  <T>(values: Dictionary, annotation: Annotation<T>): Option.Option<T>;
} = Function.dual<
  <T>(annotation: Annotation<T>) => (values: Dictionary) => Option.Option<T>,
  <T>(values: Dictionary, annotation: Annotation<T>) => Option.Option<T>
>(2, (values, annotation) => {
  return internalAnnotations.getDictionary(values, annotation);
});

/**
 * Set the value of an annotation in a Dictionary.
 *
 * Can also be used within Obj.update callback:
 *
 * ```ts
 * Obj.update(obj, (obj) => {
 *   Annotation.setDictionary(obj.annotations, ColorAnnotation, 'red');
 * });
 * ```
 */
export const setDictionary: {
  <T>(annotation: Annotation<T>, value: T): (values: Dictionary) => void;
  <T>(values: Types.Mutable<Dictionary>, annotation: Annotation<T>, value: T): void;
} = Function.dual<
  <T>(annotation: Annotation<T>, value: T) => (values: Dictionary) => void,
  <T>(values: Types.Mutable<Dictionary>, annotation: Annotation<T>, value: T) => void
>(3, (values, annotation, value) => {
  return internalAnnotations.setDictionary(values, annotation, value);
});
