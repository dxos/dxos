//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Scene from './scene.ts';
import { ascii, coordinates, extract, rows } from './view.ts';

const node = (id: string, label: string, x: number, y: number): Scene.WorldObject => ({
  id,
  origin: { x, y },
  elements: [{ kind: 'rect', id: 'frame', x: 0, y: 0, w: 128, h: 64, text: label }],
});

// Two boxes side by side, one below the first, and connectors A → B (right) and A → C (down).
const SCENE: Scene.WorldObject[] = [
  node('a', 'Alpha', 0, 0),
  node('b', 'Beta', 256, 0),
  node('c', 'Gamma', 0, 192),
  {
    id: 'ab',
    elements: [
      {
        kind: 'line',
        id: 'ab-path',
        points: [
          { x: 128, y: 32 },
          { x: 200, y: 32 },
        ],
      },
      { kind: 'arrow', id: 'ab', start: { x: 200, y: 32 }, end: { x: 256, y: 32 } },
      { kind: 'text', id: 'ab-label', x: 180, y: 16, text: 'calls' },
    ],
  },
  {
    id: 'ac',
    elements: [{ kind: 'arrow', id: 'ac', start: { x: 64, y: 64 }, end: { x: 64, y: 192 } }],
  },
];

describe('view', () => {
  test('extract resolves each connector to the boxes at its ends', ({ expect }) => {
    const { boxes, paths, bounds } = extract(SCENE);
    expect(boxes.map(({ label }) => label)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(paths.map(({ from, to, label }) => [from?.label, to?.label, label])).toEqual([
      ['Alpha', 'Beta', 'calls'],
      ['Alpha', 'Gamma', undefined],
    ]);
    expect(bounds).toEqual({ x: 0, y: 0, w: 384, h: 256 });
  });

  test('coordinates lists positions in grid cells', ({ expect }) => {
    const text = coordinates(SCENE);
    expect(text).toContain('canvas 12 × 8 cells');
    expect(text).toContain('box "Gamma": top-left (0, 6), size 4 × 2');
    expect(text).toContain('arrow "Alpha" → "Beta" labelled "calls": (4, 1) → (6.3, 1) → (8, 1)');
  });

  test('ascii draws boxes, labels and arrowheads where a reader expects them', ({ expect }) => {
    const lines = ascii(SCENE).split('\n');
    const [alpha] = lines.flatMap((line, row) => (line.includes('Alpha') ? [row] : []));
    expect(lines[alpha]).toMatch(/Alpha.*▶.*Beta/);
    const gamma = lines.findIndex((line) => line.includes('Gamma'));
    expect(gamma).toBeGreaterThan(alpha);
    expect(lines.slice(alpha, gamma).some((line) => line.includes('▼'))).toBe(true);
  });

  test('a connector routed outside every box stays on the canvas', ({ expect }) => {
    const around: Scene.WorldObject = {
      id: 'ba',
      elements: [
        {
          kind: 'line',
          id: 'ba-path',
          points: [
            { x: 320, y: 0 },
            { x: 320, y: -64 },
            { x: 64, y: -64 },
          ],
        },
        { kind: 'arrow', id: 'ba', start: { x: 64, y: -64 }, end: { x: 64, y: 0 } },
      ],
    };
    const scene = [...SCENE, around];
    expect(extract(scene).bounds.y).toBe(-64);
    expect(() => ascii(scene)).not.toThrow();
    expect(coordinates(scene)).not.toMatch(/\(-/);
  });

  test('connectors with the same element id in different objects stay distinct', ({ expect }) => {
    const edge = (id: string, from: Scene.Point, to: Scene.Point, text: string): Scene.WorldObject => ({
      id,
      elements: [
        { kind: 'arrow', id: 'edge', start: from, end: to },
        { kind: 'text', id: 'edge-label', x: 0, y: 0, text },
      ],
    });
    const scene = [
      ...SCENE.slice(0, 3),
      edge('ab', { x: 128, y: 32 }, { x: 256, y: 32 }, 'calls'),
      edge('ac', { x: 64, y: 64 }, { x: 64, y: 192 }, 'owns'),
    ];
    expect(extract(scene).paths.map(({ ref, to, label }) => [ref, to?.label, label])).toEqual([
      ['ab/edge', 'Beta', 'calls'],
      ['ac/edge', 'Gamma', 'owns'],
    ]);
  });

  test('rows reads boxes top to bottom and says which way each arrow runs', ({ expect }) => {
    expect(rows(SCENE).split('\n')).toEqual([
      'row 1 (top), left to right: "Alpha", "Beta"',
      'row 2 (bottom), left to right: "Gamma"',
      'arrow "Alpha" → "Beta" labelled "calls" runs right, row 1 to row 1, 1 bends',
      'arrow "Alpha" → "Gamma" runs down, row 1 to row 2',
      'no arrows cross',
    ]);
  });
});
