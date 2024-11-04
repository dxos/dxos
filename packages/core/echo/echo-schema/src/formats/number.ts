//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';
import { conditionalPipe } from './util';

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
    (s) => conditionalPipe(s, decimals !== undefined, (s) => s.pipe(S.multipleOf(Math.pow(10, -(decimals ?? 2))))),
    S.annotations({
      [FormatAnnotationId]: FormatEnum.Currency,
      [AST.TitleAnnotationId]: 'Currency',
      [AST.DescriptionAnnotationId]: 'Currency value',
      ...(code ? { [CurrencyAnnotationId]: code.toUpperCase() } : {}),
    }),
  );

export type PercentAnnotation = {
  decimals?: number;
};

/**
 * Percent.
 */
// TODO(burdon): Define min/max (e.g., 0, 1).
export const Percent = ({ decimals }: PercentAnnotation = { decimals: 2 }) =>
  S.Number.pipe(
    (s) => conditionalPipe(s, decimals !== undefined, (s) => s.pipe(S.multipleOf(Math.pow(10, -(decimals ?? 2))))),
    S.annotations({
      [FormatAnnotationId]: FormatEnum.Percent,
      [AST.TitleAnnotationId]: 'Percent',
      [AST.DescriptionAnnotationId]: 'Percentage value',
    }),
  );

/**
 * Unix timestamp.
 * https://en.wikipedia.org/wiki/Unix_time
 */
export const Timestamp = S.Number.annotations({ [FormatAnnotationId]: FormatEnum.Timestamp });
