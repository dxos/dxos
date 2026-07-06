//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { TRADINGVIEW_SOURCE } from '../constants';
import { Ibkr } from '../types';
import { foreignKeyEquals, mergeForeignKeys, resolveTradingViewSymbol } from './instrument';

// `resolveTradingViewSymbol` takes a snapshot (what `useObject` yields in the UI); mirror that here.
const symbolFor = (instrument: Ibkr.Instrument) => resolveTradingViewSymbol(Obj.getSnapshot(instrument));

// Fictional tickers only — this is a public repo (never real holdings).

describe('resolveTradingViewSymbol', () => {
  test('prefers the explicit TradingView foreign key over derived fields', ({ expect }) => {
    const instrument = Ibkr.makeInstrument({
      name: 'Acme Corp.',
      symbol: 'ACME',
      exchange: 'NASDAQ',
      keys: [{ source: TRADINGVIEW_SOURCE, id: 'NYSE:ACME' }],
    });
    expect(symbolFor(instrument)).toBe('NYSE:ACME');
  });

  test('derives EXCHANGE:symbol when no key is present (exchange upper-cased, symbol verbatim)', ({ expect }) => {
    const instrument = Ibkr.makeInstrument({ name: 'Acme Corp.', symbol: 'acme', exchange: 'nasdaq' });
    expect(symbolFor(instrument)).toBe('NASDAQ:acme');
  });

  test('falls back to the bare symbol when there is no exchange', ({ expect }) => {
    const instrument = Ibkr.makeInstrument({ name: 'Acme Corp.', symbol: 'ACME' });
    expect(symbolFor(instrument)).toBe('ACME');
  });
});

describe('mergeForeignKeys', () => {
  test('appends new keys and drops duplicates', ({ expect }) => {
    const ticker = { source: 'ticker/NASDAQ', id: 'ACME' };
    const cusip = { source: 'cusip', id: '000000000' };
    expect(mergeForeignKeys([ticker], [ticker, cusip])).toEqual([ticker, cusip]);
  });

  test('foreignKeyEquals matches on source and id', ({ expect }) => {
    expect(foreignKeyEquals({ source: 'a', id: '1' }, { source: 'a', id: '1' })).toBe(true);
    expect(foreignKeyEquals({ source: 'a', id: '1' }, { source: 'a', id: '2' })).toBe(false);
    expect(foreignKeyEquals({ source: 'a', id: '1' }, { source: 'b', id: '1' })).toBe(false);
  });
});
