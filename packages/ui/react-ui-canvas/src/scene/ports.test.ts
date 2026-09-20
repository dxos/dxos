//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultPorts, pairPorts, portPoint } from './ports.ts';
import { curvePath, curvePoint } from './route.ts';
import { type Bounds } from './types.ts';

const left: Bounds = { x: 0, y: 0, width: 100, height: 100 };
const right: Bounds = { x: 300, y: 0, width: 100, height: 100 };
const below: Bounds = { x: 0, y: 300, width: 100, height: 100 };

describe('ports', () => {
  test('portPoint places ports along the frame', ({ expect }) => {
    expect(portPoint(left, { id: 'e', side: 'e', offset: 0.5 })).toEqual({ x: 100, y: 50 });
    expect(portPoint(left, { id: 'n', side: 'n', offset: 0.25 })).toEqual({ x: 25, y: 0 });
  });

  test('automatic pairing picks the closest pair and re-pairs after a move', ({ expect }) => {
    const pair = pairPorts({ bounds: left, ports: defaultPorts }, { bounds: right, ports: defaultPorts });
    expect([pair?.source.id, pair?.target.id]).toEqual(['e', 'w']);
    const moved = pairPorts({ bounds: left, ports: defaultPorts }, { bounds: below, ports: defaultPorts });
    expect([moved?.source.id, moved?.target.id]).toEqual(['s', 'n']);
  });

  test('a pinned port is honoured on its end only', ({ expect }) => {
    const pair = pairPorts({ bounds: left, ports: defaultPorts, port: 'n' }, { bounds: right, ports: defaultPorts });
    expect([pair?.source.id, pair?.target.id]).toEqual(['n', 'w']);
    // An unknown pinned port falls back to automatic.
    const fallback = pairPorts(
      { bounds: left, ports: defaultPorts, port: 'gone' },
      { bounds: right, ports: defaultPorts },
    );
    expect(fallback?.source.id).toBe('e');
  });

  test('curvePath starts and ends at the ports and its midpoint lies between them', ({ expect }) => {
    const from = { point: { x: 100, y: 50 }, side: 'e' as const };
    const to = { point: { x: 300, y: 50 }, side: 'w' as const };
    expect(curvePath(from, to)).toMatch(/^M 100 50 C .* 300 50$/);
    const mid = curvePoint(from, to, 0.5);
    expect(mid.x).toBeCloseTo(200);
    expect(mid.y).toBeCloseTo(50);
  });
});
