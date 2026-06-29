//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { fetchFlexReport, parseCash, parseClosedLots, parseOpenLots, parsePositions, parseTrades } from './flex-client';

const xml = readFileSync(fileURLToPath(new URL('./__fixtures__/flex-report.xml', import.meta.url)), 'utf8');

// A report that DOES carry the optional levelOfDetail column, to prove it still wins when present.
const levelOfDetailXml = `<FlexQueryResponse><FlexStatements count="1"><FlexStatement>
<OpenPositions>
<OpenPosition levelOfDetail="SUMMARY" currency="USD" symbol="ZETA" position="15" costBasisMoney="2400" />
<OpenPosition levelOfDetail="LOT" currency="USD" symbol="ZETA" position="10" costBasisMoney="1500" openDateTime="20240115" />
<OpenPosition levelOfDetail="LOT" currency="USD" symbol="ZETA" position="5" costBasisMoney="900" openDateTime="20250820" />
</OpenPositions>
</FlexStatement></FlexStatements></FlexQueryResponse>`;

describe('flex parsers', () => {
  test('parsePositions returns one aggregate row per instrument, excluding lot rows', ({ expect }) => {
    const positions = parsePositions(xml);
    expect(positions).toHaveLength(2);
    expect(positions[0]).toMatchObject({ symbol: 'ACME', quantity: 15, unrealizedPnl: 600, currency: 'USD' });
    expect(positions[1]).toMatchObject({ symbol: 'GLBX', quantity: 8, currency: 'EUR' });
  });

  test('parseOpenLots returns each lot via openDateTime even when levelOfDetail is absent', ({ expect }) => {
    const lots = parseOpenLots(xml);
    expect(lots).toHaveLength(3);
    expect(lots[0]).toMatchObject({ symbol: 'ACME', quantity: 10, acquired: '20240115;120000', costBasis: 1500 });
    expect(lots[2]).toMatchObject({ symbol: 'GLBX', quantity: 8, acquired: '20250610;100000' });
  });

  test('levelOfDetail wins when present: SUMMARY is the aggregate, LOT rows are lots', ({ expect }) => {
    expect(parsePositions(levelOfDetailXml)).toHaveLength(1);
    expect(parsePositions(levelOfDetailXml)[0]).toMatchObject({ symbol: 'ZETA', quantity: 15, costBasis: 2400 });
    expect(parseOpenLots(levelOfDetailXml)).toHaveLength(2);
  });

  test('parseTrades maps date/side/quantity/price and ignores closed <Lot> rows', ({ expect }) => {
    const trades = parseTrades(xml);
    expect(trades).toHaveLength(2);
    expect(trades[1]).toMatchObject({ symbol: 'WIDG', side: 'SELL', quantity: -4, price: 200 });
  });

  test('parseClosedLots returns realized disposals for tax reporting', ({ expect }) => {
    const closed = parseClosedLots(xml);
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({
      symbol: 'WIDG',
      acquired: '20240301',
      sold: '20260521',
      proceeds: 804.8,
      costBasis: 700,
      realizedPnl: 104.8,
    });
  });

  test('parseCash returns per-currency balances and skips BASE_SUMMARY', ({ expect }) => {
    expect(parseCash(xml)).toEqual([
      { currency: 'USD', endingCash: 1234.56 },
      { currency: 'EUR', endingCash: 789.01 },
    ]);
  });
});

describe('fetchFlexReport', () => {
  test('sends request, polls past 1019, then parses', async ({ expect }) => {
    const calls: string[] = [];
    const fetchImpl = async (url: string): Promise<Response> => {
      calls.push(url);
      if (url.includes('SendRequest')) {
        return new Response(
          '<FlexStatementResponse><Status>Success</Status><ReferenceCode>REF1</ReferenceCode></FlexStatementResponse>',
        );
      }
      // First GetStatement: still generating; second: the report.
      if (calls.filter((call) => call.includes('GetStatement')).length === 1) {
        return new Response(
          '<FlexStatementResponse><Status>Warn</Status><ErrorCode>1019</ErrorCode><ErrorMessage>Statement generation in progress</ErrorMessage></FlexStatementResponse>',
        );
      }
      return new Response(xml);
    };

    const report = await fetchFlexReport({ token: 't', queryId: 'q', fetchImpl, delayMs: 0 });
    expect(report.positions).toHaveLength(2);
    expect(report.trades).toHaveLength(2);
    expect(report.cash).toHaveLength(2);
    expect(calls[0]).toContain('SendRequest');
    expect(calls.filter((call) => call.includes('GetStatement'))).toHaveLength(2);
  });

  test('throws a clear error when SendRequest fails', async ({ expect }) => {
    const fetchImpl = async (): Promise<Response> =>
      new Response(
        '<FlexStatementResponse><Status>Fail</Status><ErrorCode>1003</ErrorCode><ErrorMessage>Statement could not be generated</ErrorMessage></FlexStatementResponse>',
      );
    await expect(fetchFlexReport({ token: 't', queryId: 'q', fetchImpl, delayMs: 0 })).rejects.toThrow(/1003/);
  });

  test('stops without retrying on a rate-limit/lockout code', async ({ expect }) => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      return new Response(
        '<FlexStatementResponse><Status>Warn</Status><ErrorCode>1025</ErrorCode><ErrorMessage>Too many failed attempts. Please review your configuration.</ErrorMessage></FlexStatementResponse>',
      );
    };
    await expect(fetchFlexReport({ token: 't', queryId: 'q', fetchImpl, delayMs: 0 })).rejects.toThrow(/rate limit/i);
    // SendRequest returns the lockout — never proceeds to polling.
    expect(calls).toBe(1);
  });
});
