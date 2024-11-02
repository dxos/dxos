//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { type JsonSchemaType } from '../ast';

//
// Custom annotations
// https://json-schema.org/understanding-json-schema/reference/schema
// TODO(burdon): Factor out JSON Schema dialog?
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

//
// Fields
// https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
//

// TODO(burdon): Can this be derived from the annotation? Or just be a union of all the annotation symbols?
//  - E.g., use a common annotation namespace.
export enum FormatEnum {
  // TODO(burdon): Array/Enum?
  // TODO(burdon): Remove primitives from format.
  // NOTE: Currently including these as a convenience.
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'date', // TODO(burdon): Use S.Date instead?
  Ref = 'ref',

  URI = 'uri',
  Email = 'email',
  Currency = 'currency',

  // TODO(burdon): Not implemented yet.
  Text = 'text',
  JSON = 'json',
  Timestamp = 'timestamp',
  DateTime = 'datetime',
  Duration = 'duration',
  Time = 'time',
  Formula = 'formula',
  UUID = 'uuid',
  REGEX = 'regex',
  DID = 'did', // Users, etc.
  // TODO(burdon): ECHO query.
  // TODO(burdon): IPLD.
}

export const FormatEnums = Object.values(FormatEnum).sort();

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

export const propertySchemaToFieldFormat = (propertySchema: JsonSchemaType): FormatEnum | undefined => {
  const format = propertySchema.format;

  // TODO(dmaretskyi): map .
  switch (format) {
    case 'email':
      return FormatEnum.Email;
    default:
      return undefined;
  }
};
