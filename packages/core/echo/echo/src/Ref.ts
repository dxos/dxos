//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { Ref as Ref$, RefArray, type RefResolver } from './internal';
import { getSchemaReference } from './internal';
import type * as JsonSchema from './JsonSchema';
import type * as Obj from './Obj';

export type Ref<T> = Ref$<T>;
export type Any = Ref$<Obj.source>;

export const Array = RefArray;

/**
 * Extract reference target.
 */
export type Target<R extends Any> = R extends Ref$<infer T> ? T : never;

/**
 * Reference resolver.
 */
export type Resolver = RefResolver;

export const isRef: (value: unknown) => value is Any = Ref$.isRef;

export const make = Ref$.make;

// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
export const fromDXN = Ref$.fromDXN;

// TODO(wittjosiah): Factor out?
export const isRefType = (ast: SchemaAST.AST): boolean => {
  return SchemaAST.getAnnotation<JsonSchema.JsonSchema>(ast, SchemaAST.JSONSchemaAnnotationId).pipe(
    Option.flatMap((jsonSchema) => ('$id' in jsonSchema ? Option.some(jsonSchema) : Option.none())),
    Option.flatMap((jsonSchema) => {
      const { typename } = getSchemaReference(jsonSchema) ?? {};
      return typename ? Option.some(true) : Option.some(false);
    }),
    Option.getOrElse(() => false),
  );
};
