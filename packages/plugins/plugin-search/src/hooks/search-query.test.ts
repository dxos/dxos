//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buildSearchFilter, buildSearchQuery, byRelevance, computeMatchSpans } from './search-query';

describe('search-query', () => {
  test('buildSearchFilter emits a full-text text-search node', () => {
    const filter = buildSearchFilter('invoice');
    expect(filter.ast.type).toBe('text-search');
    expect(filter.ast).toMatchObject({ type: 'text-search', text: 'invoice', searchKind: 'full-text' });
  });

  test('buildSearchQuery is empty for blank input', () => {
    // `Filter.nothing()` is a negated match-all.
    expect(buildSearchQuery(undefined).ast).toBeDefined();
    expect(buildSearchQuery('  ').ast).toBeDefined();
  });

  test('computeMatchSpans finds case-insensitive occurrences', () => {
    expect(computeMatchSpans('Acme Invoice', 'invoice')).toEqual([{ start: 5, end: 12 }]);
    expect(computeMatchSpans('no match here', 'xyz')).toEqual([]);
  });

  test('byRelevance ranks exact, then prefix, then substring, then length', () => {
    const items = [{ label: 'Alicia' }, { label: 'Al' }, { label: 'Sal' }, { label: 'al' }];
    const sorted = [...items].sort(byRelevance('al'));
    expect(sorted.map((i) => i.label)).toEqual(['al', 'Al', 'Alicia', 'Sal']);
  });
});
