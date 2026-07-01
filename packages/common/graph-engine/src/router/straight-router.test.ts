//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutEdge } from '../types';
import { StraightRouter } from './straight-router';

describe('StraightRouter', () => {
  test('routes a straight line clipped to node circumferences', ({ expect }) => {
    const router = new StraightRouter();
    const edge: LayoutEdge = {
      id: 'e',
      source: { id: 'a', x: 0, y: 0, r: 0 },
      target: { id: 'b', x: 100, y: 0, r: 0 },
    };
    const path = router.route(edge);
    expect(path.commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
    expect(path.commands[1]).toEqual({ type: 'L', x: 100, y: 0 });
  });

  test('shrinks endpoints by node radii', ({ expect }) => {
    const router = new StraightRouter();
    const edge: LayoutEdge = {
      id: 'e',
      source: { id: 'a', x: 0, y: 0, r: 10 },
      target: { id: 'b', x: 100, y: 0, r: 5 },
    };
    const path = router.route(edge);
    expect(path.commands[0]).toEqual({ type: 'M', x: 10, y: 0 });
    expect(path.commands[1]).toEqual({ type: 'L', x: 95, y: 0 });
  });

  test('labelPoint returns midpoint at t=0.5', ({ expect }) => {
    const router = new StraightRouter();
    const edge: LayoutEdge = {
      id: 'e',
      source: { id: 'a', x: 0, y: 0, r: 0 },
      target: { id: 'b', x: 100, y: 0, r: 0 },
    };
    const path = router.route(edge);
    const [x, y] = router.labelPoint(0.5, path);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(0);
  });
});
