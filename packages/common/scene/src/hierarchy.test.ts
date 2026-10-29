//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { layoutTree } from './hierarchy.ts';
import type * as Scene from './Scene.ts';
import { layout2D, model2D, scene2D } from './testing.ts';

/** A layout placing one composite object per child layout, all from the model `m`. */
const layout = (id: string, children: string[]): Scene.LayoutRecord2D =>
  layout2D(
    id,
    children.map((child) => ({ id: `to-${child}`, object: `of-${child}` })),
    'm',
  );

const model = (layouts: string[]): Scene.ModelRecord2D =>
  model2D(
    'm',
    layouts.map((id) => ({ id: `of-${id}`, kind: 'rect', parts: id })),
  );

describe('layoutTree', () => {
  test('orders layouts depth-first from the root scene, following parts', () => {
    const { order, problems } = layoutTree({
      scenes: [scene2D('s', 'a')],
      layouts: [layout('a', ['b', 'c']), layout('b', []), layout('c', [])],
      models: [model(['b', 'c'])],
    });
    expect(order).toEqual(['a', 'b', 'c']);
    expect(problems).toEqual([]);
  });

  test('reports a cycle and stops', () => {
    const { order, problems } = layoutTree({
      scenes: [scene2D('s', 'a')],
      layouts: [layout('a', ['b']), layout('b', ['a'])],
      models: [model(['a', 'b'])],
    });
    expect(order).toEqual(['a', 'b']);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('cycle');
  });
});
