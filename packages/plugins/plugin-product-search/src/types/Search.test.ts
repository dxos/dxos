//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Search from './Search';

describe('Search type', () => {
  test('make + instanceOf with defaults', ({ expect }) => {
    const search = Search.make({ name: 'Cars' });
    expect(Search.instanceOf(search)).toBe(true);
    expect(search.providers).toEqual([]);
    expect(search.results).toEqual([]);
    expect(search.criteria).toEqual({});
  });
});
