//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { canonicalTicker, findTickers, isTicker, mergeMentions } from './tickers.ts';

const symbols = (text: string) => findTickers(text).map(({ ticker, via }) => `${ticker}:${via}`);

describe('findTickers', () => {
  test('finds cashtags for any company, in canonical form', () => {
    expect(symbols('Retail piles into $gme and $BRK-B again')).toEqual(['GME:cashtag', 'BRK.B:cashtag']);
  });

  test('finds exchange-qualified symbols', () => {
    expect(symbols('Rivian Automotive (NASDAQ: RIVN) recalls trucks')).toEqual(['RIVN:exchange']);
  });

  test('finds known names and unambiguous bare symbols', () => {
    expect(symbols("Apple's iPhone sales lift AAPL while Nvidia slips")).toEqual(['AAPL:name', 'NVDA:name']);
    expect(symbols('MSFT and GOOG lead the Nasdaq')).toEqual(['MSFT:symbol', 'GOOGL:symbol']);
  });

  test('ignores ambiguous bare symbols and words that merely contain a name', () => {
    expect(symbols('T-Mobile and V are up; MA said BA was fine')).toEqual([]);
    expect(symbols('Pineapple growers and metaverse fans')).toEqual([]);
  });

  test('keeps one mention per ticker, the earliest, with its span', () => {
    const [mention] = findTickers('Tesla (NASDAQ: TSLA) rallies; Tesla again');
    expect(mention).toEqual({ ticker: 'TSLA', name: 'Tesla', via: 'name', span: { start: 0, end: 5 } });
  });

  test('names with punctuation match whole', () => {
    expect(symbols("AT&T and McDonald's report; Johnson & Johnson beats")).toEqual(['T:name', 'MCD:name', 'JNJ:name']);
  });
});

describe('mergeMentions', () => {
  test('adds model-linked tickers the regex missed, dropping malformed ones', () => {
    const merged = mergeMentions(findTickers('Apple and Rivian'), [
      { ticker: 'aapl', name: 'Apple' },
      { ticker: 'RIVN', name: 'Rivian Automotive' },
      { ticker: 'not a ticker', name: 'Acme' },
    ]);
    expect(merged.map(({ ticker, via }) => `${ticker}:${via}`)).toEqual(['AAPL:name', 'RIVN:llm']);
    expect(merged[1].name).toBe('Rivian Automotive');
  });

  test('ticker shape', () => {
    expect(isTicker('brk-b')).toBe(true);
    expect(isTicker('TOOLONG')).toBe(false);
    expect(canonicalTicker('$goog')).toBe('GOOGL');
  });
});
