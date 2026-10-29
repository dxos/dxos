//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Scene from './Scene.ts';
import { validateDocument } from './validate.ts';

const scene2d = (elements: Scene.Element2D[], id = 'root'): Scene.SceneRecord2D => ({
  id,
  dim: '2d',
  camera: { center: { x: 0, y: 0 }, zoom: 1 },
  elements: Object.fromEntries(elements.map((element) => [element.id, element])),
});

const rect = (id: string, x = 0): Scene.Element2D => ({
  id,
  kind: 'rect',
  center: { x, y: 0 },
  size: { width: 100, height: 60 },
});

const link = (id: string, from: string, to: string): Scene.Element2D => ({
  id,
  kind: 'link',
  from: { element: from },
  to: { element: to },
});

describe('validateDocument', () => {
  test('reports a duplicate element id', () => {
    const scene = scene2d([rect('a')]);
    // A record key that disagrees with its element's id is the only way a duplicate can be stored.
    const problems = validateDocument({ scenes: [{ ...scene, elements: { ...scene.elements, b: rect('a') } }] });
    expect(problems).toHaveLength(1);
    expect(problems[0].element).toBe('a');
  });

  test('reports the reserved id camera', () => {
    const problems = validateDocument({ scenes: [scene2d([rect('camera')])] });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('camera');
  });

  test('reports a link bound to a missing element', () => {
    const problems = validateDocument({ scenes: [scene2d([rect('a'), link('ab', 'a', 'b')])] });
    expect(problems.map((problem) => problem.element)).toEqual(['ab']);
  });

  test('reports a group member that does not exist', () => {
    const group: Scene.Element2D = { id: 'g', kind: 'group', members: ['a', 'missing'] };
    const problems = validateDocument({ scenes: [scene2d([rect('a'), group])] });
    expect(problems.map((problem) => problem.element)).toEqual(['g']);
  });

  test('reports a kind from the other dimension', () => {
    const problems = validateDocument({ scenes: [scene2d([{ id: 's', kind: 'sphere' }])] });
    expect(problems.map((problem) => problem.element)).toEqual(['s']);
  });

  test('reports a child scene id that is not in the document', () => {
    const problems = validateDocument({ scenes: [scene2d([{ ...rect('b'), kind: 'scene', scene: 'b-detail' }])] });
    expect(problems.map((problem) => problem.element)).toEqual(['b']);
  });

  test('accepts the A→B→C scene', () => {
    const scene = scene2d([rect('a'), rect('b', 200), rect('c', 400), link('ab', 'a', 'b'), link('bc', 'b', 'c')]);
    expect(validateDocument({ scenes: [scene] })).toEqual([]);
  });
});
