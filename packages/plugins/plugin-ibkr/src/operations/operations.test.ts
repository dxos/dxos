//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { configuredCredentialsLayer } from '@dxos/functions';

import { IBKR_SOURCE } from '../constants';
import { Ibkr } from '../types';
import GetPortfolioHandler from './get-portfolio';
import GetTradesHandler from './get-trades';
import SyncPortfolioReportHandler from './sync-portfolio';

const xml = readFileSync(fileURLToPath(new URL('../services/__fixtures__/flex-report.xml', import.meta.url)), 'utf8');
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
