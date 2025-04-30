//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

import { FormatAnnotation, FormatEnum } from './types';

const encodeMultipleOf = (divisor: number) => 1 / Math.pow(10, divisor);

const encodeMultiple =
  <A extends number>(divisor?: number) =>
  <I, R>(self: S.Schema<A, I, R>) =>
    divisor === undefined || divisor === 0 ? self : self.pipe(S.multipleOf(encodeMultipleOf(divisor)));

/**
 * Convert number of digits to multipleOf annotation.
 */
export const DecimalPrecision = S.transform(S.Number, S.Number, {
  strict: true,
  encode: (value) => encodeMultipleOf(value),
  decode: (value) => Math.log10(1 / value),
}).annotations({
  [AST.TitleAnnotationId]: 'Number of digits',
});

export const CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/Currency');

export type CurrencyAnnotation = {
  decimals?: number;
  code?: string;
};

/**
 * ISO 4217 currency code.
 */
export const Currency = ({ decimals, code }: CurrencyAnnotation = { decimals: 2 }) =>
  S.Number.pipe(
    encodeMultiple(decimals),
    FormatAnnotation.set(FormatEnum.Currency),
    S.annotations({
      [AST.TitleAnnotationId]: 'Currency',
      [AST.DescriptionAnnotationId]: 'Currency value',
      ...(code ? { [CurrencyAnnotationId]: code.toUpperCase() } : {}),
    }),
  );

export type PercentAnnotation = {
  decimals?: number;
};

/**
 * Integer.
 */
export const Integer = () =>
  S.Number.pipe(
    S.int(),
    FormatAnnotation.set(FormatEnum.Integer),
    S.annotations({
      [AST.TitleAnnotationId]: 'Integer',
      [AST.DescriptionAnnotationId]: 'Integer value',
    }),
  );

/**
 * Percent.
 */
// TODO(burdon): Define min/max (e.g., 0, 1).
export const Percent = ({ decimals }: PercentAnnotation = { decimals: 2 }) =>
  S.Number.pipe(
    encodeMultiple(decimals),
    FormatAnnotation.set(FormatEnum.Percent),
    S.annotations({
      [AST.TitleAnnotationId]: 'Percent',
      [AST.DescriptionAnnotationId]: 'Percentage value',
    }),
  );

/**
 * Unix timestamp.
 * https://en.wikipedia.org/wiki/Unix_time
 */
export const Timestamp = S.Number.pipe(
  FormatAnnotation.set(FormatEnum.Timestamp),
  S.annotations({
    [AST.TitleAnnotationId]: 'Timestamp',
    [AST.DescriptionAnnotationId]: 'Unix timestamp',
  }),
);
