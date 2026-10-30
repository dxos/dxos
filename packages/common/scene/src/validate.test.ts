//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import type * as Scene from './Scene.ts';
import { layout2D, model2D, scene2D } from './testing.ts';
import { validateDocument } from './validate.ts';

const rect = (id: string, x = 0): Scene.Element2D => ({
  id,
  type: 'rect',
  center: { x, y: 0 },
  size: { width: 128, height: 64 },
});

const link = (id: string, from: string, to: string): Scene.Element2D => ({
  id,
  type: 'link',
  source: { node: from },
  target: { node: to },
});

const doc = (
  layouts: Scene.LayoutRecord[],
  models: Scene.ModelRecord[] = [],
  scenes: Scene.SceneRecord[] = [scene2D('root', layouts[0]?.id)],
): Scene.SceneDocument => ({ scenes, layouts, models });

const messages = (document: Scene.SceneDocument) => validateDocument(document).map((problem) => problem.message);

describe('validateDocument', () => {
  test('reports a duplicate element id', () => {
    const layout = layout2D('l', [rect('a')]);
    // A record key that disagrees with its element's id is the only way a duplicate can be stored.
    const problems = validateDocument(doc([{ ...layout, elements: { ...layout.elements, b: rect('a') } }]));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ part: 'layout', id: 'l', element: 'a' });
  });

  test('reports the reserved id camera', () => {
    expect(messages(doc([layout2D('l', [rect('camera')])])).join()).toContain('camera');
  });

  test('reports a link bound to a missing element', () => {
    const problems = validateDocument(doc([layout2D('l', [rect('a'), link('ab', 'a', 'b')])]));
    expect(problems.map((problem) => problem.element)).toEqual(['ab']);
  });

  test('reports a group member that does not exist', () => {
    const group: Scene.Element2D = { id: 'g', type: 'group', members: ['a', 'missing'] };
    const problems = validateDocument(doc([layout2D('l', [rect('a'), group])]));
    expect(problems.map((problem) => problem.element)).toEqual(['g']);
  });

  test('reports a kind from the other dimension', () => {
    const problems = validateDocument(doc([layout2D('l', [{ id: 's', type: 'sphere' }])]));
    expect(problems.map((problem) => problem.element)).toEqual(['s']);
  });

  test('reports a scene whose layout is missing', () => {
    expect(messages(doc([], [], [scene2D('s', 'nowhere')]))).toEqual(['Layout "nowhere" is not in the document.']);
  });

  test('reports an element placing an object the model does not have', () => {
    const problems = validateDocument(doc([layout2D('l', [{ id: 'b', object: 'detail' }], 'm')], [model2D('m', [])]));
    expect(problems.map((problem) => problem.element)).toEqual(['b']);
  });

  test('reports an object whose parts layout is missing, and an object id that is also a kind', () => {
    const model = model2D('m', [
      { id: 'detail', type: 'rect', parts: 'gone' },
      { id: 'rect', type: 'rect' },
    ]);
    expect(messages(doc([layout2D('l', [], 'm')], [model]))).toEqual([
      'Layout "gone" is not in the document.',
      'The object id "rect" is also a kind.',
    ]);
  });

  test('reports duplicate ids per part', () => {
    expect(messages(doc([layout2D('l', []), layout2D('l', [])])).join()).toContain('Duplicate layout');
  });

  test('accepts the A→B→C layout placing objects of its model', () => {
    const model = model2D('m', [{ id: 'box', type: 'rect', size: { width: 128, height: 128 } }]);
    const layout = layout2D(
      'l',
      [
        { id: 'a', object: 'box', center: { x: 0, y: 0 } },
        { id: 'b', object: 'box', center: { x: 256, y: 0 } },
        rect('c', 512),
        link('ab', 'a', 'b'),
        link('bc', 'b', 'c'),
      ],
      'm',
    );
    expect(validateDocument(doc([layout], [model]))).toEqual([]);
  });
});
