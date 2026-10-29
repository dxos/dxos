//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { geoAreas, geoEntities, geoModel } from '../testing/geo-areas-fixture.ts';
import { sessionModel } from '../testing/model-fixture.ts';
import {
  adjustedCount,
  boundsOf,
  describeValue,
  expressionParts,
  locatedCount,
  requirementExpression,
  resetOverrides,
  scoreExpression,
  setAreasMode,
  setRequirementOverride,
  setTermOverride,
  termExpression,
  termRows,
  valueExpression,
} from './model-panel.ts';
import { AREA_TERM } from './rating.ts';
import { type Rateable, type RatingModel, type RatingTerm, type Requirement } from './rating.ts';

const items: Rateable[] = [
  { id: 'a', types: ['schema:Cafe'], props: { price: [10], rent: [100], fee: [20], name: ['Meeple'] } },
  { id: 'b', types: ['schema:Cafe'], props: { price: [30], rent: [200], name: ['Dice Cup'] } },
  { id: 'c', types: ['schema:Bar'], props: { price: [90] } },
];

const price: RatingTerm = { id: 'price', label: 'Price', weight: 2, value: { prop: 'price' }, shape: 'lower' };
const cost: RatingTerm = {
  id: 'cost',
  label: 'Cost',
  weight: 1,
  value: { sum: ['rent', 'fee'] },
  shape: { min: 50, max: 150, soft: 50 },
};
const dice: RatingTerm = {
  id: 'dice',
  label: 'Dice',
  weight: -0.5,
  value: { match: 'name', pattern: 'dice' },
  shape: 'flag',
};
const cheap: Requirement = { label: 'Cheap', value: { prop: 'price' }, op: '<', target: 50 };

const model: RatingModel = {
  version: 1,
  rationale: '',
  types: ['schema:Cafe'],
  terms: [price, cost, dice],
  require: [cheap],
};

describe('model panel', () => {
  test("a formula carries the session's bounds, over the results in scope only", ({ expect }) => {
    expect(boundsOf(model, price, items)).toEqual({ lo: 10, hi: 30 });
    expect(termExpression(price, boundsOf(model, price, items))).toBe('s = (30 − price) / 20');
    expect(termExpression(cost, undefined)).toBe('s = max(0, 1 − dist(rent + fee, [50, 150]) / 50)');
    expect(termExpression(dice, undefined)).toBe('s = name ~ /dice/i');
    expect(termExpression(price, { lo: 5, hi: 5 })).toBe('s = 1  (every result has 5)');
  });

  test('a real model reads with its target and its CURIEs', ({ expect }) => {
    const [rating] = sessionModel.terms;
    expect(rating && termExpression(rating, undefined)).toBe(
      's = max(0, 1 − |schema:ratingValue − 4.9| / 0.15);  missing → 0.4',
    );
    expect(expressionParts('s = schema:ratingValue − 4.9')).toEqual(['s = ', 'schema:', 'ratingValue − 4.9']);
  });

  test('the score formula names penalties and requirements while they are on', ({ expect }) => {
    expect(scoreExpression(model, {})).toBe('score = (Σ wᵢ·sᵢ + Σ|negative wᵢ|) / Σ|wᵢ| × 0.3^(missed requirements)');
    expect(scoreExpression(model, { terms: { dice: { off: true } }, require: { Cheap: { off: true } } })).toBe(
      'score = (Σ wᵢ·sᵢ) / Σ|wᵢ|',
    );
    expect(requirementExpression(cheap)).toBe('price < 50');
    expect(requirementExpression({ label: 'Where', value: { prop: 'city' }, op: '=', target: 'Ari' })).toBe(
      'city = "Ari"',
    );
  });

  test("rows carry the person's weight, coverage and share of the terms that are on", ({ expect }) => {
    const rows = termRows(model, { terms: { price: { weight: 3 }, cost: { off: true } } }, items);
    expect(rows.map((row) => [row.term.id, row.weight, row.off, row.nudged, row.coverage])).toEqual([
      ['price', 3, false, true, 3],
      ['cost', 1, true, false, 2],
      ['dice', -0.5, false, false, 1],
    ]);
    expect(rows.map((row) => Math.round(row.share * 100))).toEqual([86, 0, 14]);
  });

  test('editing overrides drops what returns to the agent', ({ expect }) => {
    const nudged = setTermOverride({}, 'price', { weight: 3 });
    expect(nudged).toEqual({ terms: { price: { weight: 3 } } });
    const off = setTermOverride(nudged, 'price', { off: true });
    expect(off).toEqual({ terms: { price: { weight: 3, off: true } } });
    expect(setTermOverride(setTermOverride(off, 'price', { weight: undefined }), 'price', { off: false })).toEqual({
      terms: {},
    });
    expect(setRequirementOverride({}, 'Cheap', true)).toEqual({ require: { Cheap: { off: true } } });
    expect(setRequirementOverride({ require: { Cheap: { off: true } } }, 'Cheap', false)).toEqual({ require: {} });
  });

  test('counts the adjustments, ignoring a weight equal to the agent weight', ({ expect }) => {
    expect(adjustedCount(model, undefined)).toBe(0);
    expect(adjustedCount(model, { terms: { price: { weight: 2 } } })).toBe(0);
    expect(
      adjustedCount(model, { terms: { price: { weight: 3 }, dice: { off: true } }, require: { Cheap: { off: true } } }),
    ).toBe(3);
  });
});

describe('area notation', () => {
  const near = {
    id: 'w',
    label: 'Near Wierzbno',
    shape: { type: 'Circle' as const, center: [21.0129, 52.1906] as [number, number], radiusM: 500 },
    softM: 400,
  };
  const square = { ...near, id: 's', label: 'Mokotów', softM: 0 };

  test('reads an area term and requirement like the web UI', ({ expect }) => {
    const term = { id: 'lh-areas', label: 'In', weight: 1, value: { within: [near] }, shape: 'flag' as const };
    expect(termExpression(term, undefined)).toBe('s = inside(area "Near Wierzbno") ? 1 : max(0, 1 − dist / 400 m)');
    expect(valueExpression({ within: [near, square] })).toBe(
      'max((inside(area "Near Wierzbno") ? 1 : max(0, 1 − dist / 400 m)), (inside(area "Mokotów")))',
    );
    expect(describeValue({ within: [near, square] })).toBe('location in “Near Wierzbno” or “Mokotów”');
    expect(requirementExpression({ label: 'Inside', value: { within: [near] }, op: '>', target: 0 })).toBe(
      'inside(area "Near Wierzbno") or dist < 400 m',
    );
  });
});

describe('area rows', () => {
  const overrides = { areas: geoAreas };

  test('lists the preferred areas as one own term the person can weight and turn off', ({ expect }) => {
    const rows = termRows(geoModel, overrides, geoEntities);
    const area = rows.find((row) => row.term.id === AREA_TERM);
    expect(area?.term.own).toBe(true);
    expect(area?.coverage).toBe(2);
    expect(adjustedCount(geoModel, overrides)).toBe(1);
    const off = setTermOverride(overrides, AREA_TERM, { off: true });
    expect(termRows(geoModel, off, geoEntities).find((row) => row.term.id === AREA_TERM)?.off).toBe(true);
  });

  test('flips the areas between prefer and require, and reset keeps them', ({ expect }) => {
    const required = setAreasMode(overrides, 'require');
    expect(termRows(geoModel, required, geoEntities).some((row) => row.term.id === AREA_TERM)).toBe(false);
    expect(adjustedCount(geoModel, required)).toBe(1);
    expect(scoreExpression(geoModel, required)).toContain('missed requirements');
    expect(resetOverrides({ ...overrides, terms: { price: { off: true } } })).toEqual({ areas: geoAreas });
    expect(resetOverrides({ terms: { price: { off: true } } })).toEqual({});
  });

  test('counts the results with a location', ({ expect }) => {
    expect(locatedCount(geoEntities)).toBe(3);
  });
});
