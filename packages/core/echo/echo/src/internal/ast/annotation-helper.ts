//
// Copyright 2025 DXOS.org
//

import type * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

export interface AnnotationHelper<T> {
  get: (schema: Schema.Schema.Any) => Option.Option<T>;
  set: (value: T) => <S extends Schema.Schema.Any>(schema: S) => S;
}

export const createAnnotationHelper = <T>(id: symbol): AnnotationHelper<T> => ({
  get: (schema) => SchemaAST.getAnnotation(schema.ast, id),
  set:
    (value) =>
    <S extends Schema.Schema.Any>(schema: S) =>
      schema.annotations({ [id]: value }) as S,
});
