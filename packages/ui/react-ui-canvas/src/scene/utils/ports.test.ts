//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../model/registry.ts';
import { type Bounds, MAJOR_GRID } from '../model/types.ts';
import { defaultPorts, nodePorts, pairPorts, portPoint, sidePorts } from './ports.ts';
import { curvePath, curvePoint } from './route.ts';
import { createNode } from './shapes.ts';

// Frames on the major grid, four cells wide: the three default ports per side land on grid lines.
const left: Bounds = { x: 0, y: 0, width: 256, height: 256 };
const right: Bounds = { x: 640, y: 0, width: 256, height: 256 };
const below: Bounds = { x: 0, y: 640, width: 256, height: 256 };

describe('ports', () => {
  test('sidePorts spreads N ports per side, centre first', ({ expect }) => {
    expect(sidePorts(3).map((port) => port.id)).toEqual([
      'n2',
      'n1',
      'n3',
      'e2',
      'e1',
      'e3',
      's2',
      's1',
      's3',
      'w2',
      'w1',
      'w3',
    ]);
    expect(sidePorts(1).map((port) => port.id)).toEqual(['n1', 'e1', 's1', 'w1']);
    expect(sidePorts(2).map((port) => port.offset)).toEqual([1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3]);
  });

  test('portPoint snaps the port to the major grid line nearest its offset, within the side', ({ expect }) => {
    expect(portPoint(left, { id: 'e2', side: 'e', offset: 0.5 })).toEqual({ x: 256, y: 128 });
    expect(portPoint(left, { id: 'n1', side: 'n', offset: 0.25 })).toEqual({ x: 64, y: 0 });
    // Off-grid offsets and frames snap to the absolute grid.
    expect(portPoint({ x: 40, y: 0, width: 100, height: 100 }, { id: 'n1', side: 'n', offset: 0.25 })).toEqual({
      x: 64,
      y: 0,
    });
    // Never a corner: the nearest grid line inside the side wins.
    expect(portPoint({ x: 0, y: 0, width: 100, height: 100 }, { id: 'e3', side: 'e', offset: 0.9 })).toEqual({
      x: 100,
      y: 64,
    });
    // A side with no grid line inside puts the port at its centre.
    expect(portPoint({ x: 0, y: 0, width: 64, height: 64 }, { id: 'n1', side: 'n', offset: 0.25 })).toEqual({
      x: 32,
      y: 0,
    });
    expect(portPoint(left, { id: 'e2', side: 'e', offset: 0.5 }, 1)).toEqual({ x: 256, y: 128 });
  });

  test('nodePorts collapses ports that snap to the same point and honours the type count', ({ expect }) => {
    const wide = createNode({
      type: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 128, y: 64 },
      size: { width: 256, height: 128 },
    });
    const ports = nodePorts(defaultNodeRegistry, wide);
    // North keeps three (64, 128, 192); the east side holds one grid line (64), so its three collapse into `e2`.
    expect(ports.filter((port) => port.side === 'n').map((port) => port.id)).toEqual(['n2', 'n1', 'n3']);
    expect(ports.filter((port) => port.side === 'e').map((port) => port.id)).toEqual(['e2']);
    // One cell wide: no grid line inside any side, so each side keeps its centre port only.
    const narrow = createNode({
      type: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 32, y: 32 },
      size: { width: 64, height: 64 },
    });
    expect(nodePorts(defaultNodeRegistry, narrow).map((port) => port.id)).toEqual(['n2', 'e2', 's2', 'w2']);
    const ellipse = createNode({ type: 'ellipse', id: 'e', z: 'a', center: { x: 128, y: 128 } });
    expect(nodePorts(defaultNodeRegistry, ellipse).map((port) => port.id)).toEqual(['n1', 'e1', 's1', 'w1']);
    expect(MAJOR_GRID).toBe(64);
  });

  test('automatic pairing picks the closest pair and re-pairs after a move', ({ expect }) => {
    const pair = pairPorts({ bounds: left, ports: defaultPorts }, { bounds: right, ports: defaultPorts });
    expect([pair?.source.id, pair?.target.id]).toEqual(['e2', 'w2']);
    const moved = pairPorts({ bounds: left, ports: defaultPorts }, { bounds: below, ports: defaultPorts });
    expect([moved?.source.id, moved?.target.id]).toEqual(['s2', 'n2']);
  });

  test('a pinned port is honoured on its end only', ({ expect }) => {
    const pair = pairPorts({ bounds: left, ports: defaultPorts, port: 'n2' }, { bounds: right, ports: defaultPorts });
    expect([pair?.source.id, pair?.target.id]).toEqual(['n2', 'w1']);
    // An unknown pinned port falls back to automatic.
    const fallback = pairPorts(
      { bounds: left, ports: defaultPorts, port: 'gone' },
      { bounds: right, ports: defaultPorts },
    );
    expect(fallback?.source.id).toBe('e2');
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
