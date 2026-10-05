//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compact } from './compact.ts';
import type * as Scene from './scene.ts';

const GEOMETRY = {
  cell: { w: 192, h: 96 },
  pitch: { x: 384, y: 224 },
  framePad: 32,
  frameLabel: 32,
  frameGap: 32,
};

const at = (col: number, row: number): Scene.Point => ({ x: col * GEOMETRY.pitch.x, y: row * GEOMETRY.pitch.y });

describe('compact', () => {
  test('pulls a detached package up to the package it connects to', ({ expect }) => {
    const graph = {
      nodes: ['A', 'B', 'C', 'D'],
      groups: [
        { id: 'top', children: ['A', 'B'] },
        { id: 'bottom', children: ['C', 'D'] },
      ],
      edges: [
        { from: 'A', to: 'C' },
        { from: 'C', to: 'D' },
      ],
    };
    const positions = new Map([
      ['A', at(0, 0)],
      ['B', at(1, 0)],
      ['C', at(0, 4)],
      ['D', at(1, 4)],
    ]);
    const result = compact(graph, positions, GEOMETRY);

    // One row of clearance holds both frames; the edge still runs down.
    expect(result.get('A')).toEqual(at(0, 0));
    expect(result.get('C')).toEqual(at(0, 1));
    expect(result.get('D')).toEqual(at(1, 1));
  });

  test('never reverses an edge or stacks two boxes', ({ expect }) => {
    const graph = {
      nodes: ['A', 'B', 'C'],
      groups: [],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
    };
    const positions = new Map([
      ['A', at(0, 0)],
      ['B', at(0, 3)],
      ['C', at(0, 6)],
    ]);
    const result = compact(graph, positions, GEOMETRY);
    const rows = ['A', 'B', 'C'].map((id) => result.get(id)?.y ?? Number.NaN);

    expect(rows).toEqual([at(0, 0).y, at(0, 1).y, at(0, 2).y]);
    expect(new Set([...result.values()].map(({ x, y }) => `${x}:${y}`)).size).toBe(3);
  });
});
