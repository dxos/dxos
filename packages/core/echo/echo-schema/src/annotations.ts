//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import * as AST from '@effect/schema/AST';
import { pipe } from 'effect';
import * as Option from 'effect/Option';
import { type Simplify } from 'effect/Types';

import { checkIdNotPresentOnSchema } from './ast';
import { type Identifiable } from './types';

export type ToMutable<T> = T extends {}
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

// TODO(burdon): Standardize names.

//
// Object
//

export const EchoObjectAnnotationId = Symbol.for('@dxos/schema/annotation/EchoObject');

export type EchoObjectAnnotation = {
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
    const ast = AST.annotations(schemaWithId.ast, { [EchoObjectAnnotationId]: { typename, version } });
    return S.make(ast) as S.Schema<Simplify<Identifiable & ToMutable<A>>>;
  };

export const getEchoObjectAnnotation = (schema: S.Schema<any>): EchoObjectAnnotation | undefined =>
  pipe(
    AST.getAnnotation<EchoObjectAnnotation>(EchoObjectAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

// TODO(burdon): Rename getTypename.
export const getEchoObjectTypename = (schema: S.Schema<any>): string | undefined =>
  getEchoObjectAnnotation(schema)?.typename;

//
// Reference
//

export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = EchoObjectAnnotation;

export const getReferenceAnnotation = (schema: S.Schema<any>) =>
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
