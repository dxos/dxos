//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { pipe } from 'effect';
import * as Option from 'effect/Option';
import { type Simplify } from 'effect/Types';

import { checkIdNotPresentOnSchema } from './ast';
import { type Identifiable } from './types';

export const IndexAnnotation = Symbol.for('@dxos/schema/annotation/Index');
export const getIndexAnnotation = AST.getAnnotation<boolean>(IndexAnnotation);

// TODO(burdon): Rename ECHO?
// TODO(burdon): Make private to this file?
export const EchoObjectAnnotationId = Symbol.for('@dxos/echo-schema/annotation/NamedSchema');
export type EchoObjectAnnotation = {
  storedSchemaId?: string;
  typename: string;
  version: string; // TODO(burdon): Semvar.
};

export const getEchoObjectAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<EchoObjectAnnotation>(EchoObjectAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

/**
 * @param typename
 * @param version
 */
// TODO(burdon): Rename createSchema.
// TODO(dmaretskyi): Add `id` field to the schema type.
export const echoObject =
  (typename: string, version: string) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<Simplify<Identifiable & ToMutable<A>>> => {
    if (!AST.isTypeLiteral(self.ast)) {
      throw new Error('echoObject can only be applied to S.Struct instances.');
    }

    checkIdNotPresentOnSchema(self);

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    return S.make(AST.annotations(schemaWithId.ast, { [EchoObjectAnnotationId]: { typename, version } })) as S.Schema<
      Simplify<Identifiable & ToMutable<A>>
    >;
  };

export const ReferenceAnnotation = Symbol.for('@dxos/schema/annotation/Reference');
export type ReferenceAnnotationValue = EchoObjectAnnotation;
export const getRefAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotation)(schema.ast),
    Option.getOrElse(() => undefined),
  );

export const EchoObjectFieldMetaAnnotationId = Symbol.for('@dxos/echo-schema/annotation/FieldMeta');
type FieldMetaValue = Record<string, string | number | boolean | undefined>;
export type EchoObjectFieldMetaAnnotation = {
  [namespace: string]: FieldMetaValue;
};
export const getFieldMetaAnnotation = <T>(field: AST.PropertySignature, namespace: string) =>
  pipe(
    AST.getAnnotation<EchoObjectFieldMetaAnnotation>(EchoObjectFieldMetaAnnotationId)(field.type),
    Option.map((meta) => meta[namespace] as T),
    Option.getOrElse(() => undefined),
  );

export const fieldMeta =
  (namespace: string, meta: FieldMetaValue) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[EchoObjectFieldMetaAnnotationId] as EchoObjectFieldMetaAnnotation;
    return self.annotations({
      [EchoObjectFieldMetaAnnotationId]: {
        ...existingMeta,
        [namespace]: { ...(existingMeta ?? {})[namespace], ...meta },
      },
    });
  };

export type ToMutable<T> = T extends {}
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;
