//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
// eslint-disable-next-line import/no-duplicates
import type * as S from '@effect/schema/Schema';
// eslint-disable-next-line import/no-duplicates
import { type Annotable } from '@effect/schema/Schema';
import { type Some } from 'effect/Option';
import { decamelize } from 'xcase';

// TODO(burdon): Change annotations.

type ParamKeyAnnotationType = string;
const ParamKeyAnnotationId = Symbol.for('@dxos/schema/annotation/ParamKeyAnnotation');
export const ParamKeyAnnotation =
  (value: ParamKeyAnnotationType) =>
  <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [ParamKeyAnnotationId]: value });

/**
 * HTTP params parser.
 */
export class Params<T extends Record<string, any>> {
  constructor(private readonly _schema: S.Struct<T>) {}

  /**
   * Parse URL params.
   * @param url
   */
  parse(url: URL): T {
    return Object.entries(this._schema.fields).reduce<Record<string, any>>((acc, [key, type]) => {
      let v = url.searchParams.get(decamelize(key));
      if (v == null) {
        v = url.searchParams.get(key);
      }

      if (v != null) {
        if (AST.isNumberKeyword(type.ast)) {
          acc[key] = parseInt(v);
        } else if (AST.isBooleanKeyword(type.ast)) {
          acc[key] = v === 'true' || v === '1';
        } else {
          acc[key] = v;
        }
      }

      return acc;
    }, {}) as T;
  }

  /**
   * Update URL with params.
   */
  params(url: URL, values: T): URL {
    Object.entries(values).forEach(([key, value]) => {
      const type = this._schema.fields[key];
      if (type && value != null) {
        const { value: alt } = AST.getAnnotation(ParamKeyAnnotationId)(type.ast) as Some<ParamKeyAnnotationType>;
        const k = alt ?? decamelize(key);
        url.searchParams.set(k, String(value));
      }
    });

    return url;
  }
}
