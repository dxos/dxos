//
// Copyright 2026 DXOS.org
//

import { proxyFetchLegacy } from '@dxos/edge-client';

import {
  SEC_COMPANY_FACTS_URL,
  SEC_COMPANY_TICKERS_URL,
  SEC_EDGAR_USER_AGENT,
} from '../constants';
import { EdgarFetchError, EdgarTickerNotFoundError } from '../errors';
import { Ibkr } from '../types';

import { extractFundamentalsFromEdgar, type GaapFacts } from './extract-edgar-fundamentals';

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

type CompanyFactsResponse = {
  entityName?: string;
  facts?: {
    'us-gaap'?: GaapFacts;
  };
};

type CompanyTickersResponse = Record<string, { cik_str: number; ticker: string; title: string }>;

let tickerMapPromise: Promise<Map<string, number>> | undefined;

const defaultFetch: FetchImpl = async (url, init) => {
  const response = await proxyFetchLegacy(new URL(url), {
    ...init,
    headers: {
      ...init?.headers,
      'User-Agent': SEC_EDGAR_USER_AGENT,
      Accept: 'application/json',
    },
  });
  return response;
};

const loadTickerMap = async (fetchImpl: FetchImpl): Promise<Map<string, number>> => {
  if (!tickerMapPromise) {
    tickerMapPromise = (async () => {
      const response = await fetchImpl(SEC_COMPANY_TICKERS_URL);
      if (!response.ok) {
        throw new EdgarFetchError(`SEC ticker map request failed (${response.status}).`);
      }
      const payload = (await response.json()) as CompanyTickersResponse;
      const map = new Map<string, number>();
      for (const entry of Object.values(payload)) {
        map.set(entry.ticker.toUpperCase(), entry.cik_str);
      }
      return map;
    })();
  }
  return tickerMapPromise;
};

/** Resets the in-memory ticker map (tests only). */
export const resetSecEdgarCacheForTests = (): void => {
  tickerMapPromise = undefined;
};

/** Resolves a US ticker symbol to a zero-padded SEC CIK. */
export const resolveCik = async (ticker: string, fetchImpl: FetchImpl = defaultFetch): Promise<string> => {
  const map = await loadTickerMap(fetchImpl);
  const cik = map.get(ticker.toUpperCase());
  if (!cik) {
    throw new EdgarTickerNotFoundError(ticker);
  }
  return String(cik).padStart(10, '0');
};

export type FetchEdgarFundamentalsOptions = {
  ticker: string;
  fetchImpl?: FetchImpl;
};

/** Fetches a compact fundamentals snapshot from SEC EDGAR company facts (XBRL). */
export const fetchEdgarFundamentals = async ({
  ticker,
  fetchImpl = defaultFetch,
}: FetchEdgarFundamentalsOptions): Promise<Ibkr.FundamentalsSnapshot> => {
  const cik = await resolveCik(ticker, fetchImpl);
  const response = await fetchImpl(SEC_COMPANY_FACTS_URL(cik));
  if (!response.ok) {
    throw new EdgarFetchError(`SEC company facts request failed (${response.status}).`);
  }
  const payload = (await response.json()) as CompanyFactsResponse;
  return extractFundamentalsFromEdgar(Ibkr.FundamentalsSnapshot, payload.facts?.['us-gaap']);
};
