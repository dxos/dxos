//
// Copyright 2026 DXOS.org
//

/** A listed company the deterministic index knows by ticker and name. */
export type Listing = {
  readonly ticker: string;
  /** The name feeds and Google News queries use. */
  readonly name: string;
  /** Other names the company appears under; matched case-sensitively at word boundaries. */
  readonly aliases?: ReadonlyArray<string>;
  /**
   * Whether the bare symbol (`NVDA` without `$`) counts as a mention. Off for symbols that are also words or
   * abbreviations (`V`, `MA`, `T`, `KO`), which only count as a cashtag or in an exchange-qualified form.
   */
  readonly bare?: boolean;
};

/** Large US caps, the index's known listings and the tickers the Google News and Yahoo feeds search. */
export const TICKERS: ReadonlyArray<Listing> = [
  { ticker: 'AAPL', name: 'Apple', aliases: ['Apple Inc'], bare: true },
  { ticker: 'MSFT', name: 'Microsoft', bare: true },
  { ticker: 'NVDA', name: 'Nvidia', aliases: ['NVIDIA'], bare: true },
  { ticker: 'AMZN', name: 'Amazon', aliases: ['Amazon.com'], bare: true },
  { ticker: 'GOOGL', name: 'Alphabet', aliases: ['Google', 'GOOG'], bare: true },
  { ticker: 'META', name: 'Meta Platforms', aliases: ['Meta'], bare: true },
  { ticker: 'TSLA', name: 'Tesla', bare: true },
  { ticker: 'AVGO', name: 'Broadcom', bare: true },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', aliases: ['Berkshire'] },
  { ticker: 'JPM', name: 'JPMorgan', aliases: ['JPMorgan Chase', 'JP Morgan'], bare: true },
  { ticker: 'V', name: 'Visa' },
  { ticker: 'MA', name: 'Mastercard' },
  { ticker: 'UNH', name: 'UnitedHealth', aliases: ['UnitedHealth Group'], bare: true },
  { ticker: 'XOM', name: 'Exxon Mobil', aliases: ['ExxonMobil', 'Exxon'], bare: true },
  { ticker: 'LLY', name: 'Eli Lilly', aliases: ['Lilly'], bare: true },
  { ticker: 'WMT', name: 'Walmart', bare: true },
  { ticker: 'JNJ', name: 'Johnson & Johnson', bare: true },
  { ticker: 'PG', name: 'Procter & Gamble' },
  { ticker: 'HD', name: 'Home Depot' },
  { ticker: 'COST', name: 'Costco' },
  { ticker: 'ORCL', name: 'Oracle', bare: true },
  { ticker: 'NFLX', name: 'Netflix', bare: true },
  { ticker: 'AMD', name: 'Advanced Micro Devices', aliases: ['AMD'], bare: true },
  { ticker: 'CRM', name: 'Salesforce', bare: true },
  { ticker: 'BAC', name: 'Bank of America', aliases: ['Bank America'], bare: true },
  { ticker: 'KO', name: 'Coca-Cola' },
  { ticker: 'PEP', name: 'PepsiCo' },
  { ticker: 'DIS', name: 'Disney', aliases: ['Walt Disney'] },
  { ticker: 'INTC', name: 'Intel', bare: true },
  { ticker: 'CSCO', name: 'Cisco', bare: true },
  { ticker: 'IBM', name: 'IBM', bare: true },
  { ticker: 'BA', name: 'Boeing' },
  { ticker: 'GS', name: 'Goldman Sachs' },
  { ticker: 'MS', name: 'Morgan Stanley' },
  { ticker: 'PLTR', name: 'Palantir', bare: true },
  { ticker: 'UBER', name: 'Uber', bare: true },
  { ticker: 'COIN', name: 'Coinbase' },
  { ticker: 'SBUX', name: 'Starbucks', bare: true },
  { ticker: 'NKE', name: 'Nike', bare: true },
  { ticker: 'MCD', name: "McDonald's", aliases: ['McDonalds'], bare: true },
  { ticker: 'PFE', name: 'Pfizer', bare: true },
  { ticker: 'CVX', name: 'Chevron', bare: true },
  { ticker: 'T', name: 'AT&T' },
  { ticker: 'VZ', name: 'Verizon' },
];

/** How a mention was found. */
export type MentionVia = 'cashtag' | 'exchange' | 'symbol' | 'name' | 'llm';

/** A ticker an article mentions. */
export type TickerMention = {
  readonly ticker: string;
  /** The company's name, when known. */
  readonly name?: string;
  readonly via: MentionVia;
  /** Where the first mention sits in the text (absent for model-linked names). */
  readonly span?: { readonly start: number; readonly end: number };
};

const bySymbol = new Map(TICKERS.map((listing) => [listing.ticker, listing]));

/** The listing a symbol names (GOOG and GOOGL are one company). */
export const listing = (ticker: string): Listing | undefined =>
  bySymbol.get(ticker.toUpperCase()) ?? (ticker.toUpperCase() === 'GOOG' ? bySymbol.get('GOOGL') : undefined);

/** A symbol in its canonical form: upper case, share classes with a dot (`BRK-B` → `BRK.B`), GOOG folded into GOOGL. */
export const canonicalTicker = (ticker: string): string => {
  const symbol = ticker.trim().toUpperCase().replace(/^\$/, '').replace(/[-/]/g, '.');
  return listing(symbol)?.ticker ?? symbol;
};

/** Whether a string is shaped like a US ticker (1-5 letters, optionally a share class). */
export const isTicker = (value: string): boolean => /^[A-Z]{1,5}(\.[A-Z])?$/.test(canonicalTicker(value));

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CASHTAG = /(?<![\w$])\$([A-Za-z]{1,5}(?:[.-][A-Za-z])?)(?![\w])/g;
const EXCHANGE = /\((?:(?:NASDAQ|NYSE|Nasdaq|NYSE American|AMEX|OTC|CBOE)\s*:\s*)([A-Z]{1,5}(?:[.-][A-Z])?)\)/g;
// An alias shaped like a symbol (GOOG) is another share class's symbol, matched as one.
const isSymbolAlias = (alias: string): boolean => /^[A-Z]{2,5}$/.test(alias);
const BARE = new RegExp(
  `(?<![\\w$.])(${TICKERS.filter(({ bare }) => bare)
    .flatMap(({ ticker, aliases }) => [ticker, ...(aliases ?? []).filter(isSymbolAlias)])
    .map(escape)
    .join('|')})(?![\\w])`,
  'g',
);
const NAMES: ReadonlyArray<readonly [RegExp, Listing]> = TICKERS.flatMap((entry) =>
  [entry.name, ...(entry.aliases ?? [])]
    .filter((name) => name !== entry.ticker && !isSymbolAlias(name))
    .map((name) => [new RegExp(`(?<![\\w&])${escape(name)}(?![\\w&])`, 'g'), entry] as const),
);

/**
 * The tickers a text mentions, found deterministically: `$TICKER` cashtags and exchange-qualified symbols
 * (`(NASDAQ: AAPL)`) for any company, and for the known listings their unambiguous bare symbols and names. One
 * mention per ticker, the earliest; ordered by position.
 */
export const findTickers = (text: string): TickerMention[] => {
  const found = new Map<string, TickerMention>();
  const add = (ticker: string, via: MentionVia, start: number, end: number) => {
    const symbol = canonicalTicker(ticker);
    const previous = found.get(symbol);
    if (previous?.span && previous.span.start <= start) {
      return;
    }
    const name = listing(symbol)?.name;
    found.set(symbol, { ticker: symbol, ...(name ? { name } : {}), via, span: { start, end } });
  };
  for (const match of text.matchAll(CASHTAG)) {
    add(match[1], 'cashtag', match.index, match.index + match[0].length);
  }
  for (const match of text.matchAll(EXCHANGE)) {
    add(match[1], 'exchange', match.index, match.index + match[0].length);
  }
  for (const match of text.matchAll(BARE)) {
    add(match[1], 'symbol', match.index, match.index + match[0].length);
  }
  for (const [pattern, entry] of NAMES) {
    for (const match of text.matchAll(pattern)) {
      add(entry.ticker, 'name', match.index, match.index + match[0].length);
    }
  }
  return [...found.values()].sort((left, right) => (left.span?.start ?? 0) - (right.span?.start ?? 0));
};

/**
 * Merges model-linked mentions into the deterministic ones: a ticker found both ways keeps its deterministic span, and
 * a model mention whose symbol is not ticker-shaped is dropped.
 */
export const mergeMentions = (
  found: ReadonlyArray<TickerMention>,
  linked: ReadonlyArray<{ readonly ticker: string; readonly name?: string }>,
): TickerMention[] => {
  const merged = new Map(found.map((mention) => [mention.ticker, mention]));
  for (const { ticker, name } of linked) {
    if (!isTicker(ticker)) {
      continue;
    }
    const symbol = canonicalTicker(ticker);
    if (!merged.has(symbol)) {
      const known = listing(symbol)?.name ?? name?.trim();
      merged.set(symbol, { ticker: symbol, ...(known ? { name: known } : {}), via: 'llm' });
    }
  }
  return [...merged.values()];
};
