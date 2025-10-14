//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { decamelize } from '@dxos/util';

const ParamKeyAnnotationId = Symbol.for('@dxos/schema/annotation/ParamKey');

type ParamKeyAnnotationValue = { key: string };

export const getParamKeyAnnotation: (annotated: SchemaAST.Annotated) => Option.Option<ParamKeyAnnotationValue> =
  SchemaAST.getAnnotation<ParamKeyAnnotationValue>(ParamKeyAnnotationId);

export const ParamKeyAnnotation =
  (value: ParamKeyAnnotationValue) =>
  <S extends Schema.Annotable.All>(self: S): Schema.Annotable.Self<S> =>
    self.annotations({ [ParamKeyAnnotationId]: value });

/**
 * HTTP params parser.
 * Supports custom key serialization.
 */
export class UrlParser<T extends Record<string, any>> {
  constructor(private readonly _schema: Schema.Struct<T>) {}

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
        if (SchemaAST.isNumberKeyword(type.ast)) {
          params[key] = parseInt(value);
        } else if (SchemaAST.isBooleanKeyword(type.ast)) {
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
