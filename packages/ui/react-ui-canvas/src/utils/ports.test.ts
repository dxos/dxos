//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../model/registry.ts';
import { type Bounds, type Port } from '../model/types.ts';
import { defaultPorts, nodePorts, pairPorts, portAccepts, portPoint, sidePorts } from './ports.ts';
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

  test('portPoint places the port exactly at its offset along the side', ({ expect }) => {
    expect(portPoint(left, { id: 'e2', side: 'e', offset: 0.5 })).toEqual({ x: 256, y: 128 });
    expect(portPoint(left, { id: 'n1', side: 'n', offset: 0.25 })).toEqual({ x: 64, y: 0 });
    // An off-grid offset or frame stays off the grid rather than jumping to a line.
    expect(portPoint({ x: 40, y: 0, width: 100, height: 100 }, { id: 'n1', side: 'n', offset: 0.25 })).toEqual({
      x: 65,
      y: 0,
    });
    expect(portPoint({ x: 0, y: 0, width: 100, height: 100 }, { id: 'e3', side: 'e', offset: 0.9 })).toEqual({
      x: 100,
      y: 90,
    });
    // A side shorter than a grid cell still spreads its ports.
    expect(portPoint({ x: 0, y: 0, width: 64, height: 64 }, { id: 'n1', side: 'n', offset: 0.25 })).toEqual({
      x: 16,
      y: 0,
    });
    expect(portPoint({ x: 0, y: 0, width: 64, height: 64 }, { id: 'w', side: 'w', offset: 0.3 })).toEqual({
      x: 0,
      y: 19.2,
    });
  });

  test('nodePorts keeps every distinct point and honours the type count', ({ expect }) => {
    const wide = createNode({
      type: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 128, y: 64 },
      size: { width: 256, height: 128 },
    });
    const ports = nodePorts(defaultNodeRegistry, wide);
    // Three to a side, wherever the side's length puts them (north at 64, 128, 192; east at 32, 64, 96).
    expect(ports.filter((port) => port.side === 'n').map((port) => port.id)).toEqual(['n2', 'n1', 'n3']);
    expect(ports.filter((port) => port.side === 'e').map((port) => port.id)).toEqual(['e2', 'e1', 'e3']);
    // One cell wide keeps all three a side too: the offsets no longer collapse onto one grid line.
    const narrow = createNode({
      type: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 32, y: 32 },
      size: { width: 64, height: 64 },
    });
    expect(nodePorts(defaultNodeRegistry, narrow).map((port) => port.side)).toEqual([
      ...'nnn',
      ...'eee',
      ...'sss',
      ...'www',
    ]);
    const ellipse = createNode({ type: 'ellipse', id: 'e', z: 'a', center: { x: 128, y: 128 } });
    expect(nodePorts(defaultNodeRegistry, ellipse).map((port) => port.id)).toEqual(['n1', 'e1', 's1', 'w1']);
    // Two ports at one point collapse to the first, so a definition cannot stack them.
    const stacked = {
      ...narrow,
      ports: [
        { id: 'a', side: 'n' as const, offset: 0.5 },
        { id: 'b', side: 'n' as const, offset: 0.5 },
      ],
    };
    expect(nodePorts(defaultNodeRegistry, stacked).map((port) => port.id)).toEqual(['a']);
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

describe('port direction', () => {
  const box: Bounds = { x: 0, y: 0, width: 256, height: 256 };
  const outOnly: Port = { id: 'e2', side: 'e', offset: 0.5, accepts: 'out' };
  const inOnly: Port = { id: 'w2', side: 'w', offset: 0.5, accepts: 'in' };
  const either: Port = { id: 'n2', side: 'n', offset: 0.5 };

  test('portAccepts reads the declared direction and defaults to either', ({ expect }) => {
    expect(portAccepts(outOnly, 'out')).toBe(true);
    expect(portAccepts(outOnly, 'in')).toBe(false);
    expect(portAccepts(inOnly, 'in')).toBe(true);
    expect(portAccepts(either, 'in') && portAccepts(either, 'out')).toBe(true);
  });

  test('pairPorts leaves through out ports and lands on in ports only', ({ expect }) => {
    const source = { bounds: box, ports: [inOnly, outOnly] };
    const target = { bounds: { ...box, x: 640 }, ports: [outOnly, inOnly] };
    const pair = pairPorts(source, target);
    expect([pair?.source.id, pair?.target.id]).toEqual(['e2', 'w2']);
    // A pinned port the direction forbids leaves the end automatic; no acceptable port means no pair.
    expect(pairPorts({ ...source, port: 'w2' }, target)?.source.id).toBe('e2');
    expect(pairPorts({ bounds: box, ports: [inOnly] }, target)).toBeUndefined();
  });
});
