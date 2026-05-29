//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeSearch, instanceOf as isSearch } from './Search';

describe('Search type', () => {
  test('make + instanceOf with defaults', ({ expect }) => {
    const search = makeSearch({ name: 'Cars' });
    expect(isSearch(search)).toBe(true);
    expect(search.providers).toEqual([]);
    expect(search.results).toEqual([]);
    expect(search.criteria).toEqual({});
  });
});
