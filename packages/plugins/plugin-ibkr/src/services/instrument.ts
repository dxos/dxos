//
// Copyright 2026 DXOS.org
//

import { Key, Obj } from '@dxos/echo';

import { TRADINGVIEW_SOURCE } from '../constants';
import { type Ibkr } from '../types';

/** Returns whether two foreign keys refer to the same external identifier. */
export const foreignKeyEquals = (left: Key.ForeignKey, right: Key.ForeignKey): boolean =>
  left.source === right.source && left.id === right.id;

/** Merges foreign keys without duplicates. */
export const mergeForeignKeys = (
  existing: readonly Key.ForeignKey[],
  extra: readonly Key.ForeignKey[],
): Key.ForeignKey[] => {
  const merged = [...existing];
  for (const key of extra) {
    if (!merged.some((entry) => foreignKeyEquals(entry, key))) {
      merged.push(key);
    }
  }
  return merged;
};

/** Resolves the TradingView symbol for chart embeds from static Instrument fields and meta keys. */
export const resolveTradingViewSymbol = (instrument: Obj.Snapshot<Ibkr.Instrument>): string => {
  const tradingViewKey = Obj.getKeys(instrument, TRADINGVIEW_SOURCE)[0];
  if (tradingViewKey) {
    return tradingViewKey.id;
  }
  if (instrument.exchange && instrument.symbol) {
    return `${instrument.exchange.toUpperCase()}:${instrument.symbol}`;
  }
  return instrument.symbol;
};
