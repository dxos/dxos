//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

export const CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/Currency');
export type CurrencyAnnotation = {
  code?: string;
  decimals: number;
};

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
 *
 */
export const Percent = (decimals = 2) =>
  S.Number.pipe(
    S.multipleOf(Math.pow(10, -decimals)),
    S.annotations({
      [FormatAnnotationId]: FormatEnum.Percent,
      [AST.TitleAnnotationId]: 'Percent',
      [AST.DescriptionAnnotationId]: 'Percentage value',
    }),
  );
