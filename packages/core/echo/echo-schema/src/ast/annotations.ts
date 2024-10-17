//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import { type Simplify } from 'effect/Types';

import { AST, S } from '@dxos/effect';

import { checkIdNotPresentOnSchema } from './schema-validator';
import { type Identifiable } from '../types';

export type ToMutable<T> = T extends {}
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

//
// Object
//

// TODO(burdon): Ideally change to /Object.
export const ObjectAnnotationId = Symbol.for('@dxos/schema/annotation/Object');

export type ObjectAnnotation = {
  schemaId?: string;
  typename: string;
  version: string;
};

// TODO(burdon): Rename ObjectAnnotation.
// TODO(dmaretskyi): Add `id` field to the schema type.
export const EchoObject =
  (typename: string, version: string) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<Simplify<Identifiable & ToMutable<A>>> => {
    if (!AST.isTypeLiteral(self.ast)) {
      throw new Error('EchoObject can only be applied to an S.Struct type.');
    }

    checkIdNotPresentOnSchema(self);

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, { [ObjectAnnotationId]: { typename, version } });
    return S.make(ast) as S.Schema<Simplify<Identifiable & ToMutable<A>>>;
  };

export const getObjectAnnotation = (schema: S.Schema.All): ObjectAnnotation | undefined =>
  pipe(
    AST.getAnnotation<ObjectAnnotation>(ObjectAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.typename;

//
// Reference
//

export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = ObjectAnnotation;

export const getReferenceAnnotation = (schema: S.Schema.All) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

//
// FieldMeta
//

export const FieldMetaAnnotationId = Symbol.for('@dxos/schema/annotation/FieldMeta');

export type FieldMetaValue = Record<string, string | number | boolean | undefined>;

export type FieldMetaAnnotation = {
  [namespace: string]: FieldMetaValue;
};

export const FieldMeta =
  (namespace: string, meta: FieldMetaValue) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[FieldMetaAnnotationId] as FieldMetaAnnotation;
    return self.annotations({
      [FieldMetaAnnotationId]: {
        ...existingMeta,
        [namespace]: { ...(existingMeta ?? {})[namespace], ...meta },
      },
    });
  };

export const getFieldMetaAnnotation = <T>(field: AST.PropertySignature, namespace: string) =>
  pipe(
    AST.getAnnotation<FieldMetaAnnotation>(FieldMetaAnnotationId)(field.type),
    Option.map((meta) => meta[namespace] as T),
    Option.getOrElse(() => undefined),
  );
