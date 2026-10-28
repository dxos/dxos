//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Rateable, type RatingModel, applyOverrides, hasOverrides, rank, rateAll } from './rating.ts';

const results: Rateable[] = [
  { id: 'big', types: ['schema:Cafe'], props: { games: [1200], rating: [4.2] } },
  { id: 'small', types: ['schema:Cafe'], props: { games: [200], rating: [4.9] } },
  { id: 'mid', types: ['schema:Cafe'], props: { games: [600], rating: [4.5], wifi: ['yes'] } },
];

const model: RatingModel = {
  version: 1,
  rationale: 'Library first.',
  terms: [
    { id: 'games', label: 'Games', weight: 3, value: { prop: 'games' }, shape: 'higher' },
    { id: 'rating', label: 'Rating', weight: 1, value: { prop: 'rating' }, shape: 'higher' },
  ],
};

describe('rateAll', () => {
  test('a weighted sum of min-max terms', ({ expect }) => {
    const ratings = rateAll(model, results);
    expect(ratings.get('big')?.score).toBe(0.75);
    expect(ratings.get('small')?.score).toBe(0.25);
    expect(ratings.get('mid')?.terms.map((term) => term.score)).toEqual([0.4, 0.43]);
  });

  test('a missed requirement multiplies the score by the penalty', ({ expect }) => {
    const ratings = rateAll(
      { ...model, require: [{ label: 'Wi-Fi', value: { has: 'wifi' }, op: '=', target: 1 }] },
      results,
    );
    expect(ratings.get('mid')?.missed).toEqual([]);
    expect(ratings.get('big')?.missed).toEqual(['Wi-Fi']);
    expect(ratings.get('big')?.score).toBe(0.225);
  });

  test('results outside the model types are not rated', ({ expect }) => {
    const ratings = rateAll({ ...model, types: ['schema:Restaurant'] }, results);
    expect(ratings.get('big')).toEqual({ score: 0, terms: [], missed: ['not in scope'] });
  });
});

describe('overrides', () => {
  test('turning a term off or nudging its weight re-ranks', ({ expect }) => {
    expect(rank(results, model, undefined).ranked.map((result) => result.id)).toEqual(['big', 'mid', 'small']);
    expect(rank(results, model, { terms: { games: { off: true } } }).ranked.map((result) => result.id)).toEqual([
      'small',
      'mid',
      'big',
    ]);
    expect(rank(results, model, { terms: { rating: { weight: 10 } } }).ranked[0]?.id).toBe('small');
  });

  test('a requirement turned off no longer penalises', ({ expect }) => {
    const strict: RatingModel = { ...model, require: [{ label: 'Wi-Fi', value: { has: 'wifi' }, op: '=', target: 1 }] };
    expect(applyOverrides(strict, { require: { 'Wi-Fi': { off: true } } }).require).toEqual([]);
  });

  test('a weight equal to the agent weight is not an adjustment', ({ expect }) => {
    expect(hasOverrides(model, { terms: { games: { weight: 3 } } })).toBe(false);
    expect(hasOverrides(model, { terms: { games: { weight: 2 } } })).toBe(true);
  });

  test('without a model the found order is kept', ({ expect }) => {
    const { ranked, ratings } = rank(results, undefined, undefined);
    expect(ranked.map((result) => result.id)).toEqual(['big', 'small', 'mid']);
    expect(ratings).toBeUndefined();
  });
});
