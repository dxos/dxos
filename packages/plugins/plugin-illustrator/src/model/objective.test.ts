//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { analyze } from './diagnostics';
import { DEFAULT, type Layout, evaluate, framesApart, select } from './objective';
import type * as Scene from './scene';
import { GRID } from './uml-grid';

const box = (id: string, x: number, y: number, w = 64, h = 64): Scene.WorldObject => ({
  id,
  origin: { x, y },
  elements: [{ kind: 'rect', id: 'frame', x: 0, y: 0, w, h }],
});

const layoutOf = (objects: Scene.WorldObject[]): Layout => ({ objects, report: analyze(objects) });

describe('objective', () => {
  test('a clean layout has no violations and a cost from the soft terms only', ({ expect }) => {
    const layout = layoutOf([
      box('a', 0, 0),
      box('b', 0, 200),
      { id: 'edges', elements: [{ kind: 'arrow', id: 'a-b', start: { x: 32, y: 64 }, end: { x: 32, y: 200 } }] },
    ]);
    const evaluation = evaluate(DEFAULT, layout);

    expect(evaluation.violations).toEqual([]);
    expect(evaluation.terms.map(({ id }) => id)).toEqual(['crossings', 'bends', 'uneven-frame-gaps', 'compactness']);
    expect(evaluation.cost).toBeGreaterThan(0);
  });

  test('overlapping nodes violate the hard-defect constraint', ({ expect }) => {
    const evaluation = evaluate(DEFAULT, layoutOf([box('a', 0, 0), box('b', 32, 32)]));

    expect(evaluation.violations.map(({ constraint }) => constraint)).toEqual(['no-hard-defects']);
  });

  test('frames closer than the gap violate frames-apart; uneven gaps cost', ({ expect }) => {
    // Three frames in a row, each enclosing a node so they count as containers.
    const frames = (gap1: number, gap2: number) => {
      const x1 = 0;
      const x2 = x1 + 128 + gap1;
      const x3 = x2 + 128 + gap2;
      return layoutOf([
        box('f1', x1, 0, 128, 128),
        box('n1', x1 + 32, 32, 32, 32),
        box('f2', x2, 0, 128, 128),
        box('n2', x2 + 32, 32, 32, 32),
        box('f3', x3, 0, 128, 128),
        box('n3', x3 + 32, 32, 32, 32),
      ]);
    };

    expect(framesApart(GRID).violations(frames(GRID / 2, GRID))).toHaveLength(1);
    expect(framesApart(GRID).violations(frames(GRID, GRID))).toEqual([]);

    const even = evaluate(DEFAULT, frames(GRID, GRID));
    const uneven = evaluate(DEFAULT, frames(GRID, GRID * 3));
    expect(even.terms.find(({ id }) => id === 'uneven-frame-gaps')?.value).toBe(0);
    expect(uneven.terms.find(({ id }) => id === 'uneven-frame-gaps')?.value).toBe(2);
    expect(uneven.cost).toBeGreaterThan(even.cost);
  });

  test('select prefers feasibility over cost, then lowest cost', ({ expect }) => {
    const feasibleCostly = { name: 'feasible-costly', layout: layoutOf([box('a', 0, 0), box('b', 0, 2000)]) };
    const feasibleTight = { name: 'feasible-tight', layout: layoutOf([box('a', 0, 0), box('b', 0, 200)]) };
    const infeasible = { name: 'infeasible', layout: layoutOf([box('a', 0, 0), box('b', 16, 16)]) };

    const { chosen, ranked } = select(DEFAULT, [infeasible, feasibleCostly, feasibleTight]);

    expect(chosen.candidate.name).toBe('feasible-tight');
    expect(ranked.map(({ candidate }) => candidate.name)).toEqual(['feasible-tight', 'feasible-costly', 'infeasible']);
  });
});
