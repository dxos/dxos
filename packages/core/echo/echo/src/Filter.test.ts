//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Filter from './Filter';

describe('Filter timestamp builders', () => {
  test('updated({ after }) produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.updated({ after: ts });
    expect(f.ast).toEqual({ type: 'timestamp', field: 'updatedAt', operator: 'gte', value: ts });
  });

  test('updated({ before }) produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.updated({ before: ts });
    expect(f.ast).toEqual({ type: 'timestamp', field: 'updatedAt', operator: 'lte', value: ts });
  });

  test('created({ after }) produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.created({ after: ts });
    expect(f.ast).toEqual({ type: 'timestamp', field: 'createdAt', operator: 'gte', value: ts });
  });

  test('created({ before }) produces correct AST', () => {
    const ts = 1700000000000;
    const f = Filter.created({ before: ts });
    expect(f.ast).toEqual({ type: 'timestamp', field: 'createdAt', operator: 'lte', value: ts });
  });

  test('updated() accepts Date objects', () => {
    const date = new Date('2026-03-20T21:00:00Z');
    const f = Filter.updated({ after: date });
    expect(f.ast).toEqual({ type: 'timestamp', field: 'updatedAt', operator: 'gte', value: date.getTime() });
  });

  test('created() accepts Date objects', () => {
    const date = new Date('2026-03-20T09:00:00Z');
    const f = Filter.created({ before: date });
    expect(f.ast).toEqual({ type: 'timestamp', field: 'createdAt', operator: 'lte', value: date.getTime() });
  });

  test('updated({ after, before }) produces AND of two timestamp nodes', () => {
    const from = 1700000000000;
    const to = 1700086400000;
    const f = Filter.updated({ after: from, before: to });
    expect(f.ast).toEqual({
      type: 'and',
      filters: [
        { type: 'timestamp', field: 'updatedAt', operator: 'gte', value: from },
        { type: 'timestamp', field: 'updatedAt', operator: 'lte', value: to },
      ],
    });
  });

  test('updated({ after, before }) accepts Date objects', () => {
    const from = new Date('2026-03-19T00:00:00Z');
    const to = new Date('2026-03-20T00:00:00Z');
    const f = Filter.updated({ after: from, before: to });
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
    const timeFilter = Filter.updated({ after: 1700000000000 });
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
    const f = Filter.updated({ after: Date.now() });
    expect(Filter.is(f)).toBe(true);
  });
});
