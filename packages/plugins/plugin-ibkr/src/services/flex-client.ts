//
// Copyright 2026 DXOS.org
//

import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy';

import { FLEX_BASE_URL } from '../constants';
import { type Ibkr } from '../types';

export type FlexReport = {
  positions: Ibkr.Position[];
  trades: Ibkr.Trade[];
  cash: Ibkr.Cash[];
};

export type FetchFlexReportOptions = {
  token: string;
  queryId: string;
  /** Injected for tests; defaults to the EDGE CORS proxy. */
  fetchImpl?: (url: string) => Promise<Response>;
  /** Poll delay in ms; pass 0 in tests. */
  delayMs?: number;
  /** Max poll attempts. */
  maxAttempts?: number;
};

/**
 * Codes meaning "still working, retry shortly": generation in progress or data not yet ready.
 * https://www.ibkrguides.com/clientportal/performanceandstatements/flex3error.htm
 */
const RETRYABLE_CODES = new Set(['1001', '1004', '1005', '1006', '1007', '1008', '1009', '1019', '1021']);

/**
 * Rate-limit / lockout codes. IBKR caps a token at 1 request/sec and 10/min, and 1025 locks the
 * token after repeated failures. Retrying extends the lockout, so these stop the flow immediately.
 */
const RATE_LIMIT_CODES = new Set(['1018', '1025']);

/**
 * Wait between SendRequest and the first GetStatement poll. SendRequest and GetStatement share
 * IBKR's 1 request/sec pacing, so the two must not fire back-to-back. Capped at `delayMs` so a
 * test passing `delayMs: 0` stays instant.
 */
const INITIAL_POLL_DELAY_MS = 1500;

/** Default fetch routes through the EDGE CORS proxy (IBKR Flex sends no CORS headers). */
const defaultFetch = (url: string): Promise<Response> => proxyFetchLegacy(new URL(url));

const tagText = (xml: string, tag: string): string | undefined =>
  xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];

const num = (value: string | undefined): number | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Flex rows are attribute-only elements; pull `<tag ... />` attributes into objects. */
const parseElements = (xml: string, tag: string): Record<string, string>[] => {
  const elements: Record<string, string>[] = [];
  const elementRe = new RegExp(`<${tag}\\b([^>]*?)/?>`, 'g');
  let element: RegExpExecArray | null;
  while ((element = elementRe.exec(xml))) {
    const attrs: Record<string, string> = {};
    const attrRe = /(\w+)="([^"]*)"/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(element[1]))) {
      attrs[attr[1]] = attr[2];
    }
    elements.push(attrs);
  }
  return elements;
};

/**
 * Open Positions come at two levels of detail: one aggregate row per instrument and, when the query
 * emits lots, one row per tax lot. IBKR includes the `levelOfDetail` attribute only when that column
 * is selected — many queries omit it — so the reliable discriminator is `openDateTime`: empty on the
 * aggregate (which spans every lot) and populated on each individual lot. `levelOfDetail` still wins
 * when present, so reports that do carry it keep working.
 */
const isLotRow = (row: Record<string, string>): boolean =>
  row.levelOfDetail === 'LOT' || (row.levelOfDetail !== 'SUMMARY' && Boolean(row.openDateTime));

export const parsePositions = (xml: string): Ibkr.Position[] =>
  parseElements(xml, 'OpenPosition')
    // Lot rows are surfaced via parseOpenLots; keep only the aggregate row per instrument.
    .filter((row) => !isLotRow(row))
    .map((row) => ({
      symbol: row.symbol,
      quantity: num(row.position) ?? 0,
      markPrice: num(row.markPrice),
      positionValue: num(row.positionValue),
      costBasis: num(row.costBasisPrice) ?? num(row.costBasisMoney),
      unrealizedPnl: num(row.fifoPnlUnrealized) ?? num(row.unrealizedPnl),
      currency: row.currency,
    }));

export const parseTrades = (xml: string): Ibkr.Trade[] =>
  parseElements(xml, 'Trade').map((row) => ({
    date: row.tradeDate ?? row.dateTime ?? '',
    side: row.buySell ?? '',
    quantity: num(row.quantity) ?? 0,
    symbol: row.symbol,
    price: num(row.tradePrice),
    commission: num(row.ibCommission),
    currency: row.currency,
  }));

/** `BASE_SUMMARY` is IBKR's base-currency rollup row — drop it. */
export const parseCash = (xml: string): Ibkr.Cash[] =>
  parseElements(xml, 'CashReportCurrency')
    .filter((row) => row.currency && row.currency !== 'BASE_SUMMARY')
    .map((row) => ({ currency: row.currency, endingCash: num(row.endingCash) ?? 0 }));

/** Open tax lots from the per-lot Open Positions rows (present only when the query emits lot detail). */
export const parseOpenLots = (xml: string): Ibkr.Lot[] =>
  parseElements(xml, 'OpenPosition')
    .filter(isLotRow)
    .map((row) => ({
      symbol: row.symbol,
      quantity: num(row.position) ?? 0,
      acquired: row.openDateTime,
      costBasis: num(row.costBasisMoney),
      markPrice: num(row.markPrice),
      value: num(row.positionValue),
      unrealizedPnl: num(row.fifoPnlUnrealized) ?? num(row.unrealizedPnl),
      currency: row.currency,
    }));

/** Closed tax lots (realized disposals) from `<Lot>` rows in the Trades section, for capital-gains reporting. */
export const parseClosedLots = (xml: string): Ibkr.Lot[] =>
  parseElements(xml, 'Lot').map((row) => ({
    symbol: row.symbol,
    acquired: row.openDateTime,
    sold: row.tradeDate ?? row.dateTime ?? '',
    quantity: num(row.quantity) ?? 0,
    costBasis: num(row.cost),
    proceeds: num(row.proceeds),
    realizedPnl: num(row.fifoPnlRealized),
    currency: row.currency,
  }));

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const rateLimitError = (code: string, message: string | undefined): Error =>
  new Error(
    `IBKR rate limit (code ${code}): ${message ?? ''} Wait a few minutes before trying again — repeated attempts extend the lockout.`.trim(),
  );

/**
 * Two-step Flex Web Service flow returning the raw report XML: SendRequest yields a reference code,
 * then GetStatement is polled until the report is generated (RETRYABLE_CODES keep polling;
 * RATE_LIMIT_CODES stop immediately; anything else fails fast).
 *
 * Polling stays under IBKR's per-token cap (1 request/sec, 10/min): one SendRequest, a brief wait
 * to space the first poll, then a poll every `delayMs`. The default 8 polls spaced 7s span ~50s —
 * long enough for generation, slow enough to stay under the 10/min limit that otherwise locks the
 * token.
 */
export const fetchFlexReportXml = async ({
  token,
  queryId,
  fetchImpl = defaultFetch,
  delayMs = 7000,
  maxAttempts = 8,
}: FetchFlexReportOptions): Promise<string> => {
  const sendXml = await (
    await fetchImpl(`${FLEX_BASE_URL}.SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`)
  ).text();
  if (tagText(sendXml, 'Status') !== 'Success') {
    const code = tagText(sendXml, 'ErrorCode');
    const message = tagText(sendXml, 'ErrorMessage');
    if (code && RATE_LIMIT_CODES.has(code)) {
      throw rateLimitError(code, message);
    }
    throw new Error(`IBKR SendRequest failed: ${code} ${message ?? ''}`.trim());
  }
  const referenceCode = tagText(sendXml, 'ReferenceCode');
  if (!referenceCode) {
    throw new Error('IBKR SendRequest returned no reference code.');
  }

  // Space the first poll from SendRequest to respect IBKR's shared 1 req/sec pacing.
  await sleep(Math.min(INITIAL_POLL_DELAY_MS, delayMs));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const xml = await (
      await fetchImpl(
        `${FLEX_BASE_URL}.GetStatement?t=${encodeURIComponent(token)}&q=${encodeURIComponent(referenceCode)}&v=3`,
      )
    ).text();
    if (xml.includes('<FlexQueryResponse')) {
      return xml;
    }
    const code = tagText(xml, 'ErrorCode');
    if (code && RATE_LIMIT_CODES.has(code)) {
      throw rateLimitError(code, tagText(xml, 'ErrorMessage'));
    }
    if (!code || !RETRYABLE_CODES.has(code)) {
      throw new Error(`IBKR GetStatement failed: ${code} ${tagText(xml, 'ErrorMessage') ?? ''}`.trim());
    }
    // Statement is still generating; wait before the next poll (no wait after the final attempt).
    if (delayMs > 0 && attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }
  throw new Error('IBKR Flex report timed out while still generating; try again in about a minute.');
};

/** Fetches and parses a Flex report into structured positions, trades, and cash balances. */
export const fetchFlexReport = async (options: FetchFlexReportOptions): Promise<FlexReport> => {
  const xml = await fetchFlexReportXml(options);
  return { positions: parsePositions(xml), trades: parseTrades(xml), cash: parseCash(xml) };
};
