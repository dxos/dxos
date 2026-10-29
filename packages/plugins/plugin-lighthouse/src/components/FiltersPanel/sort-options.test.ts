//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { applyView, cleanView, deriveFacets } from '#model';

import { filterModel, filterResults, filterView } from '../../testing/filters-fixture.ts';
import { formatBound, sortKey, sortOptions, stepOf } from './sort-options.ts';

describe('sort options', () => {
  const facets = deriveFacets(filterResults, filterModel);

  test('score first, areas when drawn, each number and date both ways', ({ expect }) => {
    const keys = sortOptions(facets, true).map((option) => option.key);
    expect(keys.slice(0, 2)).toEqual(['score', 'distance']);
    expect(keys).toContain('value:lh:areaM2:desc');
    expect(keys).toContain('value:sum:lh:monthlyPrice+lh:adminFee:asc');
    expect(keys).toContain('date:schema:datePosted:desc');
    expect(sortOptions(facets, false).map((option) => option.key)).not.toContain('distance');
  });

  test("a view's sort finds its option again", ({ expect }) => {
    const keys = new Set(sortOptions(facets, false).map((option) => option.key));
    expect(sortKey(undefined)).toBe('score');
    expect(sortKey(filterView.sort)).toBe('value:lh:areaM2:desc');
    for (const option of sortOptions(facets, true)) {
      expect(sortKey(option.sort)).toBe(option.key);
    }
    expect(keys.has(sortKey(filterView.sort))).toBe(true);
  });

  test('slider steps and bounds read well', ({ expect }) => {
    expect(stepOf({ min: 2800, max: 7600, integer: true })).toBe(50);
    expect(stepOf({ min: 1, max: 4, integer: true })).toBe(1);
    expect(stepOf({ min: 0, max: 0 })).toBe(1);
    expect(formatBound(12345.6)).toBe('12,346');
    expect(formatBound(121.684)).toBe('121.68');
  });

  test("the fixture's view is clean and cuts the results, largest flat first", ({ expect }) => {
    expect(cleanView(filterView)).toEqual(filterView);
    const { results } = applyView(filterResults, filterView, {});
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(filterResults.length);
    const areas = results.map((result) => Number(result.props['lh:areaM2']?.[0] ?? 0));
    expect([...areas].sort((a, b) => b - a)).toEqual(areas);
  });
});
