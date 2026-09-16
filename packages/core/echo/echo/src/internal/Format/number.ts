//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { FormatAnnotation, TypeFormat } from './types.ts';

const encodeMultipleOf = (divisor: number) => 1 / Math.pow(10, divisor);

const encodeMultiple =
  <A extends number>(divisor?: number) =>
  <I, R>(self: Schema.Codec<A, I, R>) =>
    divisor === undefined || divisor === 0
      ? self
      : self.pipe(Schema.check(Schema.isMultipleOf(encodeMultipleOf(divisor))));

/**
 * Convert number of digits to multipleOf annotation.
 */
export const DecimalPrecision = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.transform({
      encode: (value: number) => encodeMultipleOf(value),
      decode: (value: number) => Math.log10(1 / value),
    }),
  ),
).annotate({
  title: 'Number of digits',
});

export const CurrencyAnnotationId = '@dxos/schema/annotation/Currency';

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
    FormatAnnotation.set(TypeFormat.Currency),
    Schema.annotate({
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
    Schema.check(Schema.isInt()),
    FormatAnnotation.set(TypeFormat.Integer),
    Schema.annotate({
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
    FormatAnnotation.set(TypeFormat.Percent),
    Schema.annotate({
      title: 'Percent',
      description: 'Percentage value',
    }),
  );

/**
 * Unix timestamp.
 * https://en.wikipedia.org/wiki/Unix_time
 */
export const Timestamp = Schema.Number.pipe(
  FormatAnnotation.set(TypeFormat.Timestamp),
  Schema.annotate({
    title: 'Timestamp',
    description: 'Unix timestamp',
  }),
);
