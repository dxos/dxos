//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ViewBuilder } from '../builder/index.ts';
import { viewOptions } from './views.ts';

describe('viewOptions', () => {
  const box = (x: number) => ({ x, y: 0, width: 200, height: 100 });
  const { views: list } = ViewBuilder.view('root', [
    ViewBuilder.view('a', [ViewBuilder.view('x').at(box(0)).properties({ label: 'Inner' })])
      .name('A')
      .at(box(0)),
    ViewBuilder.view('b').name('B').at(box(300)),
  ]).build();
  const scenes = Object.fromEntries(list.map((scene) => [scene.id, scene]));

  test('lists every scene a shape may open, named or by the label of a shape that opens it', ({ expect }) => {
    expect(viewOptions(scenes, ['root'])).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'x', label: 'Inner' },
    ]);
  });

  test('never offers a scene that would open the path again', ({ expect }) => {
    // Inside `a`: neither `a` nor the root, which opens `a`, may be opened from it; `b` and `x` may.
    expect(viewOptions(scenes, ['root', 'a']).map((option) => option.value)).toEqual(['b', 'x']);
    // Inside `x`: `a` opens `x`, so it is out too.
    expect(viewOptions(scenes, ['root', 'a', 'x']).map((option) => option.value)).toEqual(['b']);
  });

  test('a host narrows the candidates', ({ expect }) => {
    expect(viewOptions(scenes, ['root'], (id) => id !== 'x').map((option) => option.value)).toEqual(['a', 'b']);
  });
});
