//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Filter from './Filter';

describe('Filter timestamp builders', () => {
  test('updatedAfter produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.updatedAfter(ts);
    expect(f.ast).toEqual({ type: 'timestamp', field: 'updatedAt', operator: 'gte', value: ts });
  });

  test('updatedBefore produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.updatedBefore(ts);
    expect(f.ast).toEqual({ type: 'timestamp', field: 'updatedAt', operator: 'lte', value: ts });
  });

  test('createdAfter produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.createdAfter(ts);
    expect(f.ast).toEqual({ type: 'timestamp', field: 'createdAt', operator: 'gte', value: ts });
  });

  test('createdBefore produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.createdBefore(ts);
    expect(f.ast).toEqual({ type: 'timestamp', field: 'createdAt', operator: 'lte', value: ts });
  });

  test('updatedAfter accepts Date objects', () => {
    const date = new Date('2026-03-20T21:00:00Z');
    const f = Filter.updatedAfter(date);
    expect(f.ast).toEqual({ type: 'timestamp', field: 'updatedAt', operator: 'gte', value: date.getTime() });
  });

  test('createdBefore accepts Date objects', () => {
    const date = new Date('2026-03-20T09:00:00Z');
    const f = Filter.createdBefore(date);
    expect(f.ast).toEqual({ type: 'timestamp', field: 'createdAt', operator: 'lte', value: date.getTime() });
  });

  test('updatedBetween produces AND of updatedAfter and updatedBefore', () => {
    const from = 1700000000000;
    const to = 1700086400000;
    const f = Filter.updatedBetween(from, to);
    expect(f.ast).toEqual({
      type: 'and',
      filters: [
        { type: 'timestamp', field: 'updatedAt', operator: 'gte', value: from },
        { type: 'timestamp', field: 'updatedAt', operator: 'lte', value: to },
      ],
    });
  });

  test('updatedBetween accepts Date objects', () => {
    const from = new Date('2026-03-19T00:00:00Z');
    const to = new Date('2026-03-20T00:00:00Z');
    const f = Filter.updatedBetween(from, to);
    expect(f.ast).toEqual({
      type: 'and',
      filters: [
        { type: 'timestamp', field: 'updatedAt', operator: 'gte', value: from.getTime() },
        { type: 'timestamp', field: 'updatedAt', operator: 'lte', value: to.getTime() },
      ],
    });
  });

  test('timestamp filters compose with and()', () => {
    const typeFilter = Filter.everything();
    const timeFilter = Filter.updatedAfter(1700000000000);
    const combined = Filter.and(typeFilter, timeFilter);
    expect(combined.ast.type).toBe('and');
    expect((combined.ast as any).filters).toHaveLength(2);
    expect((combined.ast as any).filters[1]).toEqual({
      type: 'timestamp',
      field: 'updatedAt',
      operator: 'gte',
      value: 1700000000000,
    });
  });

  test('timestamp filters pass the is() check', () => {
    const f = Filter.updatedAfter(Date.now());
    expect(Filter.is(f)).toBe(true);
  });
});
