//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { type Bounds, NodeBase, type Port, portOffset, portSide, sidePort } from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import {
  MAX_PORTS_PER_SIDE,
  defaultPorts,
  frameExit,
  nodePorts,
  pairPorts,
  portAccepts,
  portPoint,
  portsPerSideOf,
  sidePorts,
} from './ports.ts';
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
    expect(sidePorts(2).map(portOffset)).toEqual([1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3]);
  });

  test('portPoint places the port exactly at its offset along the side', ({ expect }) => {
    expect(portPoint(left, sidePort('e2', 'right', 0.5))).toEqual({ x: 256, y: 128 });
    expect(portPoint(left, sidePort('n1', 'top', 0.25))).toEqual({ x: 64, y: 0 });
    // An off-grid offset or frame stays off the grid rather than jumping to a line.
    expect(portPoint({ x: 40, y: 0, width: 100, height: 100 }, sidePort('n1', 'top', 0.25))).toEqual({
      x: 65,
      y: 0,
    });
    expect(portPoint({ x: 0, y: 0, width: 100, height: 100 }, sidePort('e3', 'right', 0.9))).toEqual({
      x: 100,
      y: 90,
    });
    // A side shorter than a grid cell still spreads its ports.
    expect(portPoint({ x: 0, y: 0, width: 64, height: 64 }, sidePort('n1', 'top', 0.25))).toEqual({
      x: 16,
      y: 0,
    });
    expect(portPoint({ x: 0, y: 0, width: 64, height: 64 }, sidePort('w', 'left', 0.3))).toEqual({
      x: 0,
      y: 19.2,
    });
  });

  test('a port inside the frame sits at its point and leaves by the side it is nearest', ({ expect }) => {
    const inner: Port = { id: 'p', x: 0.25, y: 0.75 };
    expect(portPoint(left, inner)).toEqual({ x: 64, y: 192 });
    expect(portSide(inner)).toBe('bottom');
    // Its way out is measured from the frame's edge; a port on the edge leaves from where it is.
    expect(frameExit(portPoint(left, inner), portSide(inner), left)).toEqual({ x: 64, y: 256 });
    const edge = sidePort('e2', 'right', 0.5);
    expect(frameExit(portPoint(left, edge), portSide(edge), left)).toEqual(portPoint(left, edge));
    // A stated side wins over the nearest one.
    expect(portSide({ ...inner, side: 'left' })).toBe('left');
    expect(frameExit(portPoint(left, inner), 'left', left)).toEqual({ x: 0, y: 192 });
  });

  test('nodePorts keeps every distinct point and honours the kind count', ({ expect }) => {
    const wide = createNode({
      kind: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 128, y: 64 },
      size: { width: 256, height: 128 },
    });
    const ports = nodePorts(defaultNodeRegistry, wide);
    // Three to a side, wherever the side's length puts them (the top at 64, 128, 192; the right at 32, 64, 96).
    expect(ports.filter((port) => port.side === 'top').map((port) => port.id)).toEqual(['n2', 'n1', 'n3']);
    expect(ports.filter((port) => port.side === 'right').map((port) => port.id)).toEqual(['e2', 'e1', 'e3']);
    // One cell wide keeps all three a side too: the offsets no longer collapse onto one grid line.
    const narrow = createNode({
      kind: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 32, y: 32 },
      size: { width: 64, height: 64 },
    });
    expect(nodePorts(defaultNodeRegistry, narrow).map((port) => port.side)).toEqual(
      (['top', 'right', 'bottom', 'left'] as const).flatMap((side) => [side, side, side]),
    );
    const ellipse = createNode({ kind: 'ellipse', id: 'e', z: 'a', center: { x: 128, y: 128 } });
    expect(nodePorts(defaultNodeRegistry, ellipse).map((port) => port.id)).toEqual(['n1', 'e1', 's1', 'w1']);
    // Two ports at one point collapse to the first, so a definition cannot stack them.
    const stacked = {
      ...narrow,
      ports: [sidePort('a', 'top', 0.5), sidePort('b', 'top', 0.5)],
    };
    expect(nodePorts(defaultNodeRegistry, stacked).map((port) => port.id)).toEqual(['a']);
  });

  test('a node sets its own port count, overriding its kind', ({ expect }) => {
    const rect = createNode({
      kind: 'rect',
      id: 'r',
      z: 'a',
      center: { x: 128, y: 64 },
      size: { width: 256, height: 128 },
    });
    expect(portsPerSideOf(defaultNodeRegistry, rect)).toBe(3);
    const one = { ...rect, portsPerSide: 1 };
    expect(nodePorts(defaultNodeRegistry, one).map((port) => port.id)).toEqual(['n1', 'e1', 's1', 'w1']);
    expect(portsPerSideOf(defaultNodeRegistry, one)).toBe(1);
    // The ellipse kind has one a side; a node of it can have more.
    const ellipse = createNode({ kind: 'ellipse', id: 'e', z: 'a', center: { x: 128, y: 128 } });
    expect(portsPerSideOf(defaultNodeRegistry, ellipse)).toBe(1);
    expect(nodePorts(defaultNodeRegistry, { ...ellipse, portsPerSide: 2 })).toHaveLength(8);
    // A stored count is not range-checked, so ports clamp it rather than trust it.
    expect(portsPerSideOf(defaultNodeRegistry, { ...rect, portsPerSide: 0 })).toBe(1);
    expect(nodePorts(defaultNodeRegistry, { ...rect, portsPerSide: 1000 })).toHaveLength(4 * MAX_PORTS_PER_SIDE);
  });

  test('a stored node outside the editor ranges still validates', ({ expect }) => {
    const node = {
      ...createNode({ kind: 'rect', id: 'r', z: 'a', center: { x: 0, y: 0 } }),
      portsPerSide: 40,
      overrides: { fontSize: 200 },
    };
    expect(Schema.is(NodeBase)(node)).toBe(true);
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
    const from = { point: { x: 100, y: 50 }, side: 'right' as const };
    const to = { point: { x: 300, y: 50 }, side: 'left' as const };
    expect(curvePath(from, to)).toMatch(/^M 100 50 C .* 300 50$/);
    const mid = curvePoint(from, to, 0.5);
    expect(mid.x).toBeCloseTo(200);
    expect(mid.y).toBeCloseTo(50);
  });
});

describe('port direction', () => {
  const box: Bounds = { x: 0, y: 0, width: 256, height: 256 };
  const outOnly: Port = sidePort('e2', 'right', 0.5, 'out');
  const inOnly: Port = sidePort('w2', 'left', 0.5, 'in');
  const either: Port = sidePort('n2', 'top', 0.5);

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
