//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import * as internal from './internal';
import type * as JsonSchema from './JsonSchema';
import type * as Obj from './Obj';

export type Ref<T> = internal.Ref<T>;
export type Unknown = internal.Ref<Obj.Unknown>;

export const Array = internal.RefArray;

/**
 * Extract reference target.
 */
export type Target<R extends Unknown> = R extends internal.Ref<infer T> ? T : never;

/**
 * Reference resolver.
 */
export type Resolver = internal.RefResolver;

export const isRef: (value: unknown) => value is Unknown = internal.Ref.isRef;

export const make = internal.Ref.make;

// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
export const fromDXN = internal.Ref.fromDXN;

// TODO(wittjosiah): Factor out?
export const isRefType = (ast: SchemaAST.AST): boolean => {
  return SchemaAST.getAnnotation<JsonSchema.JsonSchema>(ast, SchemaAST.JSONSchemaAnnotationId).pipe(
    Option.flatMap((jsonSchema) => ('$id' in jsonSchema ? Option.some(jsonSchema) : Option.none())),
    Option.flatMap((jsonSchema) => {
      const { typename } = internal.getSchemaReference(jsonSchema) ?? {};
      return typename ? Option.some(true) : Option.some(false);
    }),
    Option.getOrElse(() => false),
  );
};
