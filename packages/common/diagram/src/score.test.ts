//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { analyze } from './diagnostics.ts';
import { DEFAULT, type Layout } from './objective.ts';
import type * as Scene from './scene.ts';
import { HALF_COST, evaluate, fromCost, fromObjective, overall } from './score.ts';

const box = (id: string, x: number, y: number): Scene.WorldObject => ({
  id,
  origin: { x, y },
  elements: [{ kind: 'rect', id: 'frame', x: 0, y: 0, w: 64, h: 64 }],
});

const layoutOf = (objects: Scene.WorldObject[]): Layout => ({ objects, report: analyze(objects) });

describe('score', () => {
  test('cost maps to 1 at zero, 0.5 at half, towards 0 beyond', ({ expect }) => {
    expect(fromCost(0)).toBe(1);
    expect(fromCost(HALF_COST)).toBe(0.5);
    expect(fromCost(HALF_COST * 99)).toBeCloseTo(0.01);
    expect(fromCost(-1)).toBe(1);
  });

  test('objective scorers are constraints then costs, all in [0, 1]', ({ expect }) => {
    const scores = Effect.runSync(evaluate(fromObjective(DEFAULT), layoutOf([box('a', 0, 0), box('b', 256, 0)])));
    expect(scores.map(({ kind }) => kind)).toEqual([
      ...DEFAULT.constraints.map(() => 'constraint'),
      ...DEFAULT.costs.map(() => 'cost'),
    ]);
    for (const { score } of scores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
    expect(overall(scores)).toBeGreaterThan(0);
  });

  test('a broken constraint scores 0 and gates the overall score', ({ expect }) => {
    const scores = Effect.runSync(evaluate(fromObjective(DEFAULT), layoutOf([box('a', 0, 0), box('b', 32, 32)])));
    const hard = scores.find(({ id }) => id === 'no-hard-defects');
    expect(hard?.score).toBe(0);
    expect(hard?.detail).toMatch(/overlap/);
    expect(overall(scores)).toBe(0);
  });

  test('other kinds join the mean', ({ expect }) => {
    expect(
      overall([
        { kind: 'constraint', score: 1 },
        { kind: 'cost', score: 0.5 },
        { kind: 'judge', score: 1 },
      ]),
    ).toBe(0.75);
  });
});
