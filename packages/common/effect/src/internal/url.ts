//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { decamelize } from '@dxos/util';

import * as SchemaAST from './schema-ast.ts';

// Annotation keys are strings in v4, so the id is a namespaced string rather than a symbol.
const ParamKeyAnnotationId = '@dxos/schema/annotation/ParamKey';

type ParamKeyAnnotationValue = { key: string };

export const getParamKeyAnnotation = (ast: SchemaAST.AST): ParamKeyAnnotationValue | undefined =>
  SchemaAST.getAnnotation<ParamKeyAnnotationValue>(ParamKeyAnnotationId)(ast);

export const ParamKeyAnnotation =
  (value: ParamKeyAnnotationValue) =>
  <S extends Schema.Top>(self: S): S['Rebuild'] =>
    self.annotate({ [ParamKeyAnnotationId]: value });

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
          // v4 annotations are a plain record, so the lookup returns the value or undefined
          // rather than an Option.
          const serializedKey = getParamKeyAnnotation(field.ast)?.key ?? decamelize(key);
          url.searchParams.set(serializedKey, String(value));
        }
      }
    });

    return url;
  }
}
