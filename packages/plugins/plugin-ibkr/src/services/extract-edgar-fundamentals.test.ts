//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { Ibkr } from '../types';
import { extractFundamentalsFromEdgar } from './extract-edgar-fundamentals';

const factsFixture = readFileSync(
  fileURLToPath(new URL('./__fixtures__/sec-companyfacts-aapl.json', import.meta.url)),
  'utf8',
);

describe('extract-edgar-fundamentals', () => {
  test('walks FundamentalsSnapshot annotations to build a nested snapshot', ({ expect }) => {
    const gaap = (JSON.parse(factsFixture) as { facts: { 'us-gaap': Record<string, unknown> } }).facts['us-gaap'] as
      | Parameters<typeof extractFundamentalsFromEdgar>[1]
      | undefined;

    const snapshot = extractFundamentalsFromEdgar(Ibkr.FundamentalsSnapshot, gaap);

    expect(snapshot.asOf).toBe('2024-11-01');
    expect(snapshot.performance?.revenue).toBe(391_035_000_000);
    expect(snapshot.ratios?.debtToEquity).toBeCloseTo(5.409, 2);
    expect(snapshot.additional?.additionalFacts).toEqual({ Assets: 364_980_000_000 });
  });
});
