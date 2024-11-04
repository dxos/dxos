//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

//
// Custom annotations
// https://json-schema.org/understanding-json-schema/reference/schema
//

export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/Format');

export const CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/Currency');
export type CurrencyAnnotation = {
  code?: string;
  decimals: number;
};

export const CustomAnnotations = {
  format: FormatAnnotationId,
  currency: CurrencyAnnotationId,
};

/**
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 */
export enum FormatEnum {
  // TODO(burdon): Remove primitives from format.
  /** @deprecated */
  String = 'string',
  /** @deprecated */
  Number = 'number',
  /** @deprecated */
  Boolean = 'boolean',
  /** @deprecated */
  Date = 'date',
  /** @deprecated */
  Ref = 'ref',

  Currency = 'currency',
  Email = 'email',
  URI = 'uri',

  // TODO(burdon): Not yet implemented.
  DateTime = 'datetime',
  DID = 'did', // Users, etc.
  Duration = 'duration',
  Formula = 'formula', // Spreadsheet formula.
  JSON = 'json',
  REGEX = 'regex',
  Text = 'text',
  Timestamp = 'timestamp',
  Time = 'time',
  UUID = 'uuid',
}

export const FormatEnums = Object.values(FormatEnum).sort();

/**
 * Mixin of format annotation values.
 */
// TODO(burdon): Generate from annotations?
export const FormatSchema = S.Struct({
  format: S.optional(S.Enums(FormatEnum)),
  title: S.optional(S.String),
  description: S.optional(S.String),
  currency: S.optional(S.String),
  multipleOf: S.optional(S.Number),
});

export type FormatType = S.Schema.Type<typeof FormatSchema>;

/**
 * Namespace for format annotation definitions.
 */
export namespace Format {
  /**
   * ISO 4217 currency code.
   */
  export const Currency = ({ code, decimals }: CurrencyAnnotation = { decimals: 2 }) =>
    S.Number.pipe(
      S.multipleOf(Math.pow(10, -decimals)),
      S.annotations({
        [FormatAnnotationId]: FormatEnum.Currency,
        [AST.TitleAnnotationId]: 'Currency',
        [AST.DescriptionAnnotationId]: 'Currency value',
        ...(code ? { [CurrencyAnnotationId]: code.toUpperCase() } : {}),
      }),
    );

  /**
   * Email address (RFC 5321)
   * https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2
   */
  export const Email = S.String.pipe(S.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).pipe(
    S.annotations({
      [FormatAnnotationId]: FormatEnum.Email,
      [AST.TitleAnnotationId]: 'Email',
      [AST.DescriptionAnnotationId]: 'Email address',
    }),
  );

  /**
   * URI (RFC 3986)
   * https://datatracker.ietf.org/doc/html/rfc3986
   */
  export const URI = S.String.pipe(S.pattern(/^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/)).pipe(
    S.annotations({
      [FormatAnnotationId]: FormatEnum.URI,
      [AST.TitleAnnotationId]: 'URI',
      [AST.DescriptionAnnotationId]: 'Universal resource identifier',
    }),
  );
}
