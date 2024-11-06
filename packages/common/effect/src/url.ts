//
// Copyright 2024 DXOS.org
//

import { AST, type Schema as S } from '@effect/schema';
import { Option, pipe } from 'effect';

import { decamelize } from '@dxos/util';

const ParamKeyAnnotationId = Symbol.for('@dxos/schema/annotation/ParamKey');

type ParamKeyAnnotationValue = { key: string };

export const getParamKeyAnnotation: (annotated: AST.Annotated) => Option.Option<ParamKeyAnnotationValue> =
  AST.getAnnotation<ParamKeyAnnotationValue>(ParamKeyAnnotationId);

export const ParamKeyAnnotation =
  (value: ParamKeyAnnotationValue) =>
  <S extends S.Annotable.All>(self: S): S.Annotable.Self<S> =>
    self.annotations({ [ParamKeyAnnotationId]: value });

/**
 * HTTP params parser.
 * Supports custom key serialization.
 */
export class UrlParser<T extends Record<string, any>> {
  constructor(private readonly _schema: S.Struct<T>) {}

  /**
   * Parse URL params.
   */
  parse(_url: string): T {
    const url = new URL(_url);
    return Object.entries(this._schema.fields).reduce<Record<string, any>>((params, [key, type]) => {
      let value = url.searchParams.get(decamelize(key));
      if (value == null) {
        value = url.searchParams.get(key);
      }

      if (value != null) {
        if (AST.isNumberKeyword(type.ast)) {
          params[key] = parseInt(value);
        } else if (AST.isBooleanKeyword(type.ast)) {
          params[key] = value === 'true' || value === '1';
        } else {
          params[key] = value;
        }
      }

      return params;
    }, {}) as T;
  }

  /**
   * Return URL with encoded params.
   */
  create(_url: string, params: T): URL {
    const url = new URL(_url);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        const field = this._schema.fields[key];
        if (field) {
          const { key: serializedKey } = pipe(
            getParamKeyAnnotation(field.ast),
            Option.getOrElse(() => ({
              key: decamelize(key),
            })),
          );

          url.searchParams.set(serializedKey, String(value));
        }
      }
    });

    return url;
  }
}
