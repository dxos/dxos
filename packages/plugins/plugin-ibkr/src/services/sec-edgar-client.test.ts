//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, test } from 'vitest';

import { SEC_COMPANY_FACTS_URL, SEC_COMPANY_TICKERS_URL } from '../constants';
import { fetchEdgarFundamentals, resetSecEdgarCacheForTests, resolveCik } from './sec-edgar-client';

const tickersFixture = readFileSync(
  fileURLToPath(new URL('./__fixtures__/sec-company-tickers.json', import.meta.url)),
  'utf8',
);
const factsFixture = readFileSync(
  fileURLToPath(new URL('./__fixtures__/sec-companyfacts-aapl.json', import.meta.url)),
  'utf8',
);

describe('sec-edgar-client', () => {
  beforeEach(() => {
    resetSecEdgarCacheForTests();
  });

  test('resolveCik maps a ticker to a padded CIK', async ({ expect }) => {
    const fetchImpl = async (url: string) => {
      if (url === SEC_COMPANY_TICKERS_URL) {
        return new Response(tickersFixture, { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    await expect(resolveCik('AAPL', fetchImpl)).resolves.toBe('0000320193');
  });

  test('fetchEdgarFundamentals parses headline metrics from company facts', async ({ expect }) => {
    const fetchImpl = async (url: string) => {
      if (url === SEC_COMPANY_TICKERS_URL) {
        return new Response(tickersFixture, { status: 200 });
      }
      if (url === SEC_COMPANY_FACTS_URL('0000320193')) {
        return new Response(factsFixture, { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const snapshot = await fetchEdgarFundamentals({ ticker: 'AAPL', fetchImpl });
    expect(snapshot.asOf).toBe('2024-11-01');
    expect(snapshot.performance?.revenue).toBe(391_035_000_000);
    expect(snapshot.performance?.netIncome).toBe(93_736_000_000);
    expect(snapshot.performance?.eps).toBe(6.08);
    expect(snapshot.ratios?.roe).toBeCloseTo(1.646, 2);
    expect(snapshot.ratios?.debtToEquity).toBeCloseTo(5.409, 2);
    expect(snapshot.additional?.additionalFacts).toEqual({
      Assets: 364_980_000_000,
    });
  });
});
