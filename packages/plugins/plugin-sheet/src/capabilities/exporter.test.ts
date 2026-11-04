//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { escapeCsvCell } from './exporter.ts';

describe('escapeCsvCell', () => {
  test('numbers stay numeric', () => {
    expect(['-5', '+3.2', '-.5', '1e-3', '42'].map(escapeCsvCell)).to.deep.eq(['-5', '+3.2', '-.5', '1e-3', '42']);
  });

  test('formulas are neutralized', () => {
    expect(escapeCsvCell('=SUM(A1)')).to.eq("'=SUM(A1)");
    expect(escapeCsvCell('-1+cmd|x')).to.eq("'-1+cmd|x");
    expect(escapeCsvCell('@x')).to.eq("'@x");
  });

  test('quotes cells with separators', () => {
    expect(escapeCsvCell('a,"b"')).to.eq('"a,""b"""');
  });
});
