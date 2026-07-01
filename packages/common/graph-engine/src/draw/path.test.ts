//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createPath } from './path';

describe('Path', () => {
  test('records a straight line', ({ expect }) => {
    const p = createPath();
    p.moveTo(0, 0);
    p.lineTo(10, 10);
    expect(p.commands).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 10, y: 10 },
    ]);
  });

  test('toSvg returns SVG path data', ({ expect }) => {
    const p = createPath();
    p.moveTo(0, 0);
    p.lineTo(10, 10);
    p.close();
    expect(p.toSvg()).toBe('M0 0 L10 10 Z');
  });

  test('records a bezier and arc', ({ expect }) => {
    const p = createPath();
    p.moveTo(0, 0);
    p.bezierCurveTo(1, 1, 2, 2, 3, 3);
    p.arc(0, 0, 5, 0, Math.PI);
    expect(p.commands.length).toBe(3);
  });
});
