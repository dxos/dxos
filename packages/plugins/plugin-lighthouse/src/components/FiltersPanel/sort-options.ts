//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `web/src/components/FiltersPanel.tsx` (1a137e8): the sort choices and their keys.

import { type Facet, type ViewSort } from '#model';

export type SortOption = { key: string; label: string; sort: ViewSort };

/** The sort choices: the score, each number and date either way, and closeness to the drawn areas. */
export const sortOptions = (facets: ReadonlyArray<Facet>, hasAreas: boolean): SortOption[] => [
  { key: 'score', label: 'Score (rating model)', sort: { by: 'score' } },
  ...(hasAreas ? [{ key: 'distance', label: 'Closest to your areas', sort: { by: 'distance' } as ViewSort }] : []),
  ...facets.flatMap((facet): SortOption[] => {
    const { value, prop } = facet;
    if (facet.kind === 'range' && value) {
      return (['asc', 'desc'] as const).map((dir) => ({
        key: `value:${facet.id}:${dir}`,
        label: `${facet.label} ${dir === 'asc' ? '↑ lowest first' : '↓ highest first'}`,
        sort: { by: 'value', value, label: facet.label, dir },
      }));
    }
    if (facet.kind === 'date' && prop) {
      return (['desc', 'asc'] as const).map((dir) => ({
        key: `date:${prop}:${dir}`,
        label: `${facet.label} ${dir === 'desc' ? '↓ newest first' : '↑ oldest first'}`,
        sort: { by: 'date', prop, label: facet.label, dir },
      }));
    }
    return [];
  }),
];

/** The key of the option a sort is; a value sort keys by its facet's id (`prop`, or `sum:a+b`). */
export const sortKey = (sort: ViewSort | undefined): string => {
  if (!sort || sort.by === 'score') {
    return 'score';
  }
  if (sort.by === 'distance') {
    return 'distance';
  }
  if (sort.by === 'date') {
    return `date:${sort.prop}:${sort.dir}`;
  }
  return `value:${'prop' in sort.value ? sort.value.prop : `sum:${sort.value.sum.join('+')}`}:${sort.dir}`;
};

/** A slider step: 1, 2 or 5 × 10ⁿ, about 1/200 of the range (whole numbers step at least 1). */
export const stepOf = (facet: Pick<Facet, 'min' | 'max' | 'integer'>): number => {
  const raw = ((facet.max ?? 1) - (facet.min ?? 0)) / 200;
  if (raw <= 0) {
    return 1;
  }
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = [1, 2, 5, 10].map((multiple) => multiple * power).find((step) => step >= raw) ?? raw;
  return facet.integer ? Math.max(1, Math.round(nice)) : nice;
};

/** A number as a bound's placeholder: thousands grouped from 10 000, else up to two decimals. */
export const formatBound = (value: number): string =>
  Math.abs(value) >= 10000 ? Math.round(value).toLocaleString('en-US') : String(Math.round(value * 100) / 100);
