//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import { type Simplify } from 'effect/Types';

import { AST, S } from '@dxos/effect';
import { type Primitive } from '@dxos/util';

import { checkIdNotPresentOnSchema } from './schema-validator';
import { type HasId } from './types';

type ToMutable<T> = T extends {} ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] } : T;

/**
 * ECHO object.
 */
export const ObjectAnnotationId = Symbol.for('@dxos/schema/annotation/Object');

// TODO(burdon): Reconcile with other types.
export type ObjectAnnotation = {
  schemaId?: string;
  typename: string;
  version: string;
};

export const getObjectAnnotation = (schema: S.Schema.All): ObjectAnnotation | undefined =>
  pipe(
    AST.getAnnotation<ObjectAnnotation>(ObjectAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.typename;

// TODO(burdon): Rename ObjectAnnotation.
// TODO(dmaretskyi): Add `id` property to the schema type.
export const EchoObject = (typename: string, version: string) => {
  return <A, I, R>(self: S.Schema<A, I, R>): S.Schema<Simplify<HasId & ToMutable<A>>> => {
    if (!AST.isTypeLiteral(self.ast)) {
      throw new Error('EchoObject can only be applied to an S.Struct type.');
    }

    checkIdNotPresentOnSchema(self);

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, { [ObjectAnnotationId]: { typename, version } });
    return S.make(ast) as S.Schema<Simplify<HasId & ToMutable<A>>>;
  };
};

/**
 * PropertyMeta (metadata for dynamic schema properties).
 */
export const PropertyMetaAnnotationId = Symbol.for('@dxos/schema/annotation/PropertyMeta');

export type PropertyMetaValue = Primitive | Record<string, Primitive> | Primitive[];

export type PropertyMetaAnnotation = {
  [name: string]: PropertyMetaValue;
};

export const PropertyMeta = (name: string, value: PropertyMetaValue) => {
  return <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[PropertyMetaAnnotationId] as PropertyMetaAnnotation;
    return self.annotations({
      [PropertyMetaAnnotationId]: {
        ...existingMeta,
        [name]: value,
      },
    });
  };
};

export const getPropertyMetaAnnotation = <T>(prop: AST.PropertySignature, name: string) =>
  pipe(
    AST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(prop.type),
    Option.map((meta) => meta[name] as T),
    Option.getOrElse(() => undefined),
  );

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = ObjectAnnotation;

export const getReferenceAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

// TODO(burdon): Factor out.
// TODO(burdon): Reconcile with ObjectAnnotation above.
export type SchemaMeta = {
  id: string;
  typename: string;
  version: string;
};

export const createReferenceAnnotation = (schema: SchemaMeta): S.Schema.AnyNoContext =>
  S.Any.annotations({
    [ReferenceAnnotationId]: {
      schemaId: schema.id,
      typename: schema.typename,
      version: schema.version,
    } satisfies ReferenceAnnotationValue,
  });
