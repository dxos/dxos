//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Annotation, Type } from '@dxos/echo';

// TODO(burdon): Reconcile with @dxos/echo.
export type ExcludeId<S extends Schema.Schema.AnyNoContext | Type.AnyEntity> = Omit<
  S extends Type.AnyEntity
    ? Type.InstanceType<S>
    : S extends Schema.Schema.AnyNoContext
      ? Schema.Schema.Type<S>
      : never,
  'id'
>;

// TODO(burdon): Move to @dxos/schema (re-export here).
export const omitId = <S extends Schema.Schema.AnyNoContext | Type.AnyEntity>(
  schemaOrType: S,
): Schema.Schema<ExcludeId<S>, ExcludeId<S>> => {
  const schema = Type.isType(schemaOrType)
    ? Type.getSchema(schemaOrType)
    : (schemaOrType as Schema.Schema.AnyNoContext);
  return schema.pipe(Schema.omit('id')) as any;
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
  return hidden.length === 0 ? schema : (schema.pipe(Schema.omit(...(hidden as [string, ...string[]]))) as any);
};
