//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'bun:test';

import { assertCostApproved, CostApprovalError, isCostApproved, parseApprovedCost } from './cost-guard.ts';

describe('parseApprovedCost', () => {
  test('missing or malformed values approve nothing', () => {
    expect(parseApprovedCost(undefined)).toBe(0);
    expect(parseApprovedCost('lots')).toBe(0);
    expect(parseApprovedCost('-3')).toBe(0);
  });

  test('reads a dollar amount', () => {
    expect(parseApprovedCost('40')).toBe(40);
    expect(parseApprovedCost('7.5')).toBe(7.5);
  });
});

describe('isCostApproved', () => {
  test('runs at or under the threshold need no approval', () => {
    expect(isCostApproved(0.39, 0)).toBe(true);
    expect(isCostApproved(5, 0)).toBe(true);
  });

  test('runs over the threshold need an approval that covers them', () => {
    expect(isCostApproved(5.01, 0)).toBe(false);
    expect(isCostApproved(40, 10)).toBe(false);
    expect(isCostApproved(40, 40)).toBe(true);
  });
});

describe('assertCostApproved', () => {
  test('throws with the amount to ask the user for', () => {
    expect(() => assertCostApproved(39.2, 0)).toThrow(CostApprovalError);
    expect(() => assertCostApproved(39.2, 0)).toThrow('--approve-cost=40');
    expect(() => assertCostApproved(39.2, 40)).not.toThrow();
  });
});
