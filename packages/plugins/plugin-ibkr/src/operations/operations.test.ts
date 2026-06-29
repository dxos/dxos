//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { configuredCredentialsLayer } from '@dxos/functions';

import { IBKR_SOURCE, TRADINGVIEW_SOURCE, tickerSource } from '../constants';
import { Ibkr } from '../types';
import GetInstrumentFundamentalsHandler from './get-instrument-fundamentals';
import GetPortfolioHandler from './get-portfolio';
import GetTradesHandler from './get-trades';
import MaterializeInstrumentHandler from './materialize-instrument';
import SyncPortfolioReportHandler from './sync-portfolio';

const xml = readFileSync(fileURLToPath(new URL('../services/__fixtures__/flex-report.xml', import.meta.url)), 'utf8');
const tickersFixture = readFileSync(
  fileURLToPath(new URL('../services/__fixtures__/sec-company-tickers.json', import.meta.url)),
  'utf8',
);
const factsFixture = readFileSync(
  fileURLToPath(new URL('../services/__fixtures__/sec-companyfacts-aapl.json', import.meta.url)),
  'utf8',
);
const credentials = [{ service: IBKR_SOURCE, apiKey: 'test-token', account: 'TEST-QID' }];
const originalFetch = globalThis.fetch;

describe('IBKR operations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
      if (url.includes('SendRequest')) {
        return new Response(
          '<FlexStatementResponse><Status>Success</Status><ReferenceCode>REF</ReferenceCode></FlexStatementResponse>',
        );
      }
      return new Response(xml);
    }) as typeof fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await builder.close();
  });

  test('SyncPortfolioReport fetches and stores a report the read operations can serve', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Ibkr.Report] });

    const sync = await run(SyncPortfolioReportHandler.handler({}), db, credentials);
    expect(sync.positions).toBe(2);
    expect(sync.trades).toBe(2);
    expect(sync.cash).toBe(2);
    expect(typeof sync.fetchedAt).toBe('string');

    const portfolio = await run(GetPortfolioHandler.handler({}), db);
    expect(portfolio.positions).toHaveLength(2);
    expect(portfolio.cash.map((entry: { currency: string }) => entry.currency)).toEqual(['USD', 'EUR']);
    // Reads serve the stored snapshot's timestamp.
    expect(portfolio.fetchedAt).toBe(sync.fetchedAt);

    // Fixture trade dates are from May 2026; the 7-day filter returns 0 for old data.
    const trades = await run(GetTradesHandler.handler({}), db);
    expect(trades.trades).toHaveLength(0);
  }, 20_000);

  test('GetTrades filters to only trades within the last 7 days', async ({ expect }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = yesterday.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const recentXml = `<FlexQueryResponse><FlexStatements count="1"><FlexStatement>
      <OpenPositions></OpenPositions>
      <Trades>
        <Trade accountId="U1" currency="USD" symbol="WIDG" tradeDate="${ymd}" buySell="BUY" quantity="10" tradePrice="200" ibCommission="-1" />
      </Trades>
      <CashReport></CashReport>
    </FlexStatement></FlexStatements></FlexQueryResponse>`;
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Ibkr.Report] });

    // Use the sync handler with a mock that returns the recent XML so the feed is wired up correctly.
    const savedFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
      if (url.includes('SendRequest')) {
        return new Response(
          '<FlexStatementResponse><Status>Success</Status><ReferenceCode>REF</ReferenceCode></FlexStatementResponse>',
        );
      }
      return new Response(recentXml);
    }) as typeof fetch;

    try {
      await run(SyncPortfolioReportHandler.handler({}), db, credentials);
      const trades = await run(GetTradesHandler.handler({}), db);
      expect(trades.trades).toHaveLength(1);
      expect(trades.trades[0]).toMatchObject({ symbol: 'WIDG', side: 'BUY' });
    } finally {
      globalThis.fetch = savedFetch;
    }
  }, 20_000);

  test('GetPortfolio returns empty before any sync has run', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Ibkr.Report] });
    const portfolio = await run(GetPortfolioHandler.handler({}), db);
    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.cash).toHaveLength(0);
    expect(portfolio.fetchedAt).toBeUndefined();
  });

  test('SyncPortfolioReport fails clearly when the credential is missing', ({ expect }) =>
    builder
      .createDatabase({ types: [Feed.Feed, Ibkr.Report] })
      .then(({ db }) =>
        expect(run(SyncPortfolioReportHandler.handler({}), db)).rejects.toThrow(
          /Credential not found|missing the Flex/,
        ),
      ));

  test('MaterializeInstrument is idempotent by foreign key', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Ibkr.Instrument] });
    const key = { source: tickerSource('NASDAQ'), id: 'AAPL' };
    const first = await run(MaterializeInstrumentHandler.handler({ key, symbol: 'AAPL', exchange: 'NASDAQ' }), db);
    const second = await run(MaterializeInstrumentHandler.handler({ key, symbol: 'AAPL', exchange: 'NASDAQ' }), db);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.instrument.target?.id).toBe(second.instrument.target?.id);
  });

  test('GetInstrumentFundamentals reads SEC EDGAR company facts', async ({ expect }) => {
    const savedFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
      if (url.includes('company_tickers.json')) {
        return new Response(tickersFixture);
      }
      if (url.includes('companyfacts/CIK0000320193')) {
        return new Response(factsFixture);
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    try {
      const { db } = await builder.createDatabase({ types: [Ibkr.Instrument] });
      const instrument = Ibkr.makeInstrument({
        name: 'Apple Inc.',
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        keys: [{ source: TRADINGVIEW_SOURCE, id: 'NASDAQ:AAPL' }],
      });
      db.add(instrument);
      const result = await run(GetInstrumentFundamentalsHandler.handler({ instrument: Ref.make(instrument) }), db);
      expect(result.performance?.revenue).toBe(391_035_000_000);
      expect(result.performance?.netIncome).toBe(93_736_000_000);
    } finally {
      globalThis.fetch = savedFetch;
    }
  });
});

/**
 * Run an Effect produced by `opaqueHandler.handler()` after satisfying its context.
 * `opaqueHandler` intentionally erases the context type parameter to `any`; the cast to
 * `Effect<T, any, never>` is a test-only boundary because TypeScript cannot prove `any extends
 * never` even though the layers below fully satisfy the requirement at runtime.
 */
const run = <T>(
  effect: Effect.Effect<T, any, any>,
  db: Database.Database,
  creds: typeof credentials = [],
): Promise<T> =>
  EffectEx.runPromise(
    effect.pipe(Effect.provide(Database.layer(db)), Effect.provide(configuredCredentialsLayer(creds))) as Effect.Effect<
      T,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      never
    >,
  );
