//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Collection, Type } from '@dxos/echo';

import { buildSearchFilter, buildSearchQuery, byRelevance } from './search-query';

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

  test('buildSearchQuery scopes the text search to the given type URIs', () => {
    const typeUri = Type.getURI(Collection.Collection);
    const query = buildSearchQuery('invoice', [typeUri]);
    expect(query.ast).toMatchObject({
      type: 'select',
      filter: {
        type: 'and',
        filters: [
          { type: 'text-search', text: 'invoice', searchKind: 'full-text' },
          { type: 'or', filters: [{ type: 'object', typename: typeUri }] },
        ],
      },
    });
  });

  test('buildSearchQuery with an empty type scope matches nothing', () => {
    // An unresolved (empty) scope must not fall back to an unscoped search.
    const query = buildSearchQuery('invoice', []);
    expect(query.ast).toMatchObject({ type: 'select', filter: { type: 'not' } });
  });

  test('byRelevance ranks exact, then prefix, then substring, then length', () => {
    const items = [{ label: 'Alicia' }, { label: 'Al' }, { label: 'Sal' }, { label: 'al' }];
    const sorted = [...items].sort(byRelevance('al'));
    expect(sorted.map((i) => i.label)).toEqual(['al', 'Al', 'Alicia', 'Sal']);
  });
});
