//
// Copyright 2025 DXOS.org
//

import { type Schema, SchemaAST, type Option } from 'effect';

export interface AnnotationHelper<T> {
  get: (schema: Schema.Schema.Any) => Option.Option<T>;
  set: (value: T) => <S extends Schema.Schema.Any>(schema: S) => S;
}

export const createAnnotationHelper = <T>(id: symbol): AnnotationHelper<T> => {
  return {
    get: (schema) => SchemaAST.getAnnotation(schema as any, id),
    set:
      (value) =>
      <S extends Schema.Schema.Any>(schema: S) =>
        schema.annotations({ [id]: value }) as S,
  };
};
