//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { FormatAnnotation, FormatEnum } from './types';

const encodeMultipleOf = (divisor: number) => 1 / Math.pow(10, divisor);

const encodeMultiple =
  <A extends number>(divisor?: number) =>
  <I, R>(self: Schema.Schema<A, I, R>) =>
    divisor === undefined || divisor === 0 ? self : self.pipe(Schema.multipleOf(encodeMultipleOf(divisor)));

/**
 * Convert number of digits to multipleOf annotation.
 */
export const DecimalPrecision = Schema.transform(Schema.Number, Schema.Number, {
  strict: true,
  encode: (value) => encodeMultipleOf(value),
  decode: (value) => Math.log10(1 / value),
}).annotations({
  title: 'Number of digits',
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
  Schema.Number.pipe(
    encodeMultiple(decimals),
    FormatAnnotation.set(FormatEnum.Currency),
    Schema.annotations({
      title: 'Currency',
      description: 'Currency value',
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
  Schema.Number.pipe(
    Schema.int(),
    FormatAnnotation.set(FormatEnum.Integer),
    Schema.annotations({
      title: 'Integer',
      description: 'Integer value',
    }),
  );

/**
 * Percent.
 */
// TODO(burdon): Define min/max (e.g., 0, 1).
export const Percent = ({ decimals }: PercentAnnotation = { decimals: 2 }) =>
  Schema.Number.pipe(
    encodeMultiple(decimals),
    FormatAnnotation.set(FormatEnum.Percent),
    Schema.annotations({
      title: 'Percent',
      description: 'Percentage value',
    }),
  );

/**
 * Unix timestamp.
 * https://en.wikipedia.org/wiki/Unix_time
 */
export const Timestamp = Schema.Number.pipe(
  FormatAnnotation.set(FormatEnum.Timestamp),
  Schema.annotations({
    title: 'Timestamp',
    description: 'Unix timestamp',
  }),
);
