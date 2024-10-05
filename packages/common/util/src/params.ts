//
// Copyright 2024 DXOS.org
//

import { AST, type Schema } from '@effect/schema';
import { Option, pipe } from 'effect';
import { decamelize } from 'xcase';

// TODO(burdon): Change annotations.

type ParamKeyAnnotationType = string;

const ParamKeyAnnotationId = Symbol.for('@dxos/schema/annotation/ParamKeyAnnotation');

export const ParamKeyAnnotation =
  (value: ParamKeyAnnotationType) =>
  <S extends Schema.Annotable.All>(self: S): Schema.Annotable.Self<S> =>
    self.annotations({ [ParamKeyAnnotationId]: value });

/**
 * HTTP params parser.
 */
export class Params<T extends Record<string, any>> {
  constructor(private readonly _schema: Schema.Struct<T>) {}

  /**
   * Parse URL params.
   * @param url
   */
  parse(url: URL): T {
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
   * Update URL with params.
   */
  params(url: URL, values: T): URL {
    Object.entries(values).forEach(([key, value]) => {
      const type = this._schema.fields[key];
      if (type && value != null) {
        const paramKey = pipe(
          AST.getAnnotation<ParamKeyAnnotationType>(ParamKeyAnnotationId)(type.ast),
          Option.getOrElse(() => undefined) as any,
        );

        url.searchParams.set(paramKey ?? decamelize(key), String(value));
      }
    });

    return url;
  }
}
