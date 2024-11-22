//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

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
  S.Number.pipe(encodeMultiple(decimals)).annotations({
    [FormatAnnotationId]: FormatEnum.Currency,
    [AST.TitleAnnotationId]: 'Currency',
    [AST.DescriptionAnnotationId]: 'Currency value',
    ...(code ? { [CurrencyAnnotationId]: code.toUpperCase() } : {}),
  });

export type PercentAnnotation = {
  decimals?: number;
};

/**
 * Integer.
 */
export const Integer = () =>
  S.Number.pipe(S.int()).annotations({
    [AST.TitleAnnotationId]: FormatEnum.Integer,
  });

/**
 * Percent.
 */
// TODO(burdon): Define min/max (e.g., 0, 1).
export const Percent = ({ decimals }: PercentAnnotation = { decimals: 2 }) =>
  S.Number.pipe(encodeMultiple(decimals)).annotations({
    [FormatAnnotationId]: FormatEnum.Percent,
    [AST.TitleAnnotationId]: 'Percent',
    [AST.DescriptionAnnotationId]: 'Percentage value',
  });

/**
 * Unix timestamp.
 * https://en.wikipedia.org/wiki/Unix_time
 */
export const Timestamp = S.Number.annotations({
  [FormatAnnotationId]: FormatEnum.Timestamp,
  [AST.TitleAnnotationId]: 'Timestamp',
  [AST.DescriptionAnnotationId]: 'Unix timestamp',
});
