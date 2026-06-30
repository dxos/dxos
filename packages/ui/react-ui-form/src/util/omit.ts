//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Annotation, Type } from '@dxos/echo';

// TODO(burdon): Reconcile with @dxos/echo.
// Distributive: applied per union member so `ExcludeId<A | B>` → `ExcludeId<A> | ExcludeId<B>` rather
// than `Omit<InstanceType<A> | InstanceType<B>, 'id'>` (which would intersect away per-member narrowing).
export type ExcludeId<S extends Schema.Schema.AnyNoContext | Type.AnyEntity> = S extends Type.AnyEntity
  ? Omit<Type.InstanceType<S>, 'id'>
  : S extends Schema.Schema.AnyNoContext
    ? Omit<Schema.Schema.Type<S>, 'id'>
    : never;

// TODO(burdon): Move to @dxos/schema (re-export here).
export const omitId = <S extends Schema.Schema.AnyNoContext | Type.AnyEntity>(
  schemaOrType: S,
): Schema.Schema<ExcludeId<S>, ExcludeId<S>> => {
  const schema = Type.isType(schemaOrType)
    ? Type.getSchema(schemaOrType)
    : (schemaOrType as Schema.Schema.AnyNoContext);
  // Cast: `Schema.omit` cannot statically express the `ExcludeId<S>` result type, so the result is a
  // widened schema; the runtime shape matches the declared return type.
  return omitIdFromSchema(schema) as any;
};

/**
 * Removes the `id` field where present, preserving the schema's shape. Recurses into unions so a
 * discriminated (create) schema keeps its discriminant — `Schema.omit('id')` is a struct operation and
 * would otherwise flatten the union, breaking variant rendering. A no-op when there is no `id` (plain
 * create structs that never carried one).
 */
const omitIdFromSchema = (schema: Schema.Schema.AnyNoContext): Schema.Schema.AnyNoContext => {
  const ast = schema.ast;
  if (SchemaAST.isUnion(ast)) {
    return Schema.Union(...ast.types.map((type) => omitIdFromSchema(Schema.make(type))));
  }
  const hasId = SchemaAST.getPropertySignatures(ast).some((prop) => prop.name === 'id');
  return hasId ? schema.pipe(Schema.omit('id')) : schema;
};

/**
 * Drop fields annotated with `FormInputAnnotation.set(false)` from a schema so
 * the form's validator doesn't trip on required-but-hidden fields. Used by
 * the picker's inline create form, where a `FactoryAnnotation` typically
 * supplies the hidden values (e.g. a backing-object Ref) outside the form.
 */
export const omitHiddenFormFields = <S extends Schema.Schema.AnyNoContext>(schema: S): S => {
  const properties = SchemaAST.getPropertySignatures(schema.ast);
  const hidden = properties
    .filter((prop) => Option.getOrElse(Annotation.FormInputAnnotation.getFromAst(prop.type), () => true) === false)
    .map((prop) => prop.name as string);
  // Cast: omitting a dynamically-computed set of keys can't be expressed as the original `S`, but
  // the result is structurally a subset of `S` and callers treat it as `S`.
  return hidden.length === 0 ? schema : (schema.pipe(Schema.omit(...(hidden as [string, ...string[]]))) as any);
};
