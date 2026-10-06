//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EVALUATORS, measure, overall, visionRules } from './appeal.ts';
import { RULES, keyOf, parse } from './rules.ts';
import type * as Scene from './scene.ts';

const box = (id: string, x: number, y: number, w = 128, h = 64): Scene.WorldObject => ({
  id,
  origin: { x, y },
  elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w, h, text: id }],
});

const arrow = (id: string, points: Scene.Point[]): Scene.WorldObject[] => [
  {
    id: `edge-${id}`,
    elements: [
      { kind: 'line', id: `${id}-path`, points: points.slice(0, -1) },
      { kind: 'arrow', id, start: points[points.length - 2], end: points[points.length - 1] },
    ],
  },
];

const scoreOf = (objects: Scene.WorldObject[], id: string) => measure(objects).find((rule) => rule.id === id)?.score;

describe('rules', () => {
  test('the library parses, and every code rule has an evaluator and every evaluator a rule', ({ expect }) => {
    expect(RULES.length).toBeGreaterThan(20);
    const measured = RULES.filter(({ evaluator }) => evaluator !== 'vision').map(({ id }) => id);
    expect(Object.keys(EVALUATORS).sort()).toEqual([...measured].sort());
    expect(RULES.find(({ id }) => id === 'no-edge-crossings')?.weight).toBe(10);
  });

  test('a rule the image judge asks needs a question', ({ expect }) => {
    expect(() =>
      parse('```mdl\ndiagram-rule bad: A rule\n  category: space\n  evaluator: vision\n  weight: 1\n  Prose.\n```'),
    ).toThrow(/needs a question/);
    expect(parse('```mdl\nrule other: Not a diagram rule\n  files: x\n```')).toEqual([]);
  });

  test('vision rules become judge questions keyed in camelCase', ({ expect }) => {
    const rules = visionRules();
    expect(rules.map(({ key }) => key)).toContain('tidyOverall');
    expect(rules.every(({ instructions }) => instructions.includes('attached image'))).toBe(true);
    expect(keyOf('no-edge-crossings')).toBe('noEdgeCrossings');
  });
});

describe('appeal', () => {
  test('a straight chain aligned in a column scores well on flow, alignment and bends', ({ expect }) => {
    const objects = [
      box('a', 0, 0),
      box('b', 0, 160),
      box('c', 0, 320),
      ...arrow('a-b', [
        { x: 64, y: 64 },
        { x: 64, y: 160 },
      ]),
      ...arrow('b-c', [
        { x: 64, y: 224 },
        { x: 64, y: 320 },
      ]),
    ];
    expect(scoreOf(objects, 'consistent-flow')).toBe(1);
    expect(scoreOf(objects, 'grid-alignment')).toBe(1);
    expect(scoreOf(objects, 'few-bends')).toBe(1);
    expect(scoreOf(objects, 'straight-when-aligned')).toBe(1);
    expect(scoreOf(objects, 'continuous-paths')).toBe(1);
    expect(scoreOf(objects, 'no-edge-crossings')).toBe(1);
  });

  test('a detour, a near miss and an arrow turning back are each penalised', ({ expect }) => {
    const objects = [
      box('a', 0, 0),
      box('b', 6, 160),
      ...arrow('a-b', [
        { x: 64, y: 64 },
        { x: 64, y: 100 },
        { x: 600, y: 100 },
        { x: 600, y: 140 },
        { x: 70, y: 140 },
        { x: 70, y: 160 },
      ]),
    ];
    expect(scoreOf(objects, 'edges-head-toward-target')).toBeLessThan(0.5);
    expect(scoreOf(objects, 'no-near-misses')).toBeLessThan(1);
    expect(scoreOf(objects, 'few-bends')).toBeLessThan(0.5);
  });

  test('a bus is judged hub to spoke, and a self-loop scores without NaN', ({ expect }) => {
    const objects: Scene.WorldObject[] = [
      box('hub', 64, 0),
      box('left', -64, 200),
      box('right', 192, 200),
      {
        id: 'edges',
        elements: [
          {
            kind: 'line',
            id: 'hub-bus-0-trunk',
            points: [
              { x: 128, y: 64 },
              { x: 128, y: 180 },
            ],
          },
          {
            kind: 'line',
            id: 'hub-left-path',
            points: [
              { x: 128, y: 180 },
              { x: 0, y: 180 },
            ],
          },
          { kind: 'arrow', id: 'hub-left', start: { x: 0, y: 180 }, end: { x: 0, y: 200 } },
          {
            kind: 'line',
            id: 'hub-right-path',
            points: [
              { x: 128, y: 180 },
              { x: 256, y: 180 },
            ],
          },
          { kind: 'arrow', id: 'hub-right', start: { x: 256, y: 180 }, end: { x: 256, y: 200 } },
          { kind: 'arrow', id: 'hub-hub', from: 'hub/box', to: 'hub/box' },
        ],
      },
    ];
    // Read as pieces, a spoke would start at the box nearest the junction, beside it, and run sideways.
    expect(scoreOf(objects, 'consistent-flow')).toBe(1);
    expect(measure(objects).every(({ score }) => Number.isFinite(score))).toBe(true);
  });

  test('overall is the weighted mean', ({ expect }) => {
    expect(
      overall([
        { weight: 3, score: 1 },
        { weight: 1, score: 0 },
      ]),
    ).toBe(0.75);
  });
});
