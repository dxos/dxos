//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { copyElements, pasteIntent } from './clipboard.ts';
import { applyIntent } from './intent.ts';
import { layout2D, layout3D } from './testing.ts';

const cube = (id: string, x = 0) => ({ id, type: 'cube', center: { x, y: 0, z: 0 } });
const link = (id: string, from: string, to: string) => ({
  id,
  type: 'link',
  source: { node: from },
  target: { node: to },
});

const scene = () => layout3D('l', [cube('a'), cube('b', 2), cube('c', 4), link('ab', 'a', 'b'), link('bc', 'b', 'c')]);

const counter = () => {
  let next = 0;
  return (prefix: string) => `${prefix}-${next++}`;
};

describe('clipboard', () => {
  test('a copy keeps a link only when both its ends are copied', () => {
    const fragment = copyElements(scene(), ['a', 'b']);
    expect(Object.keys(fragment.elements).sort()).toEqual(['a', 'ab', 'b']);
  });

  test('a paste gives every element a new id, rebinds links to them, and shifts each centre', () => {
    const fragment = copyElements(scene(), ['a', 'b']);
    const paste = pasteIntent(scene(), fragment, { offset: { x: 1, y: 0, z: 1 }, newId: counter() });
    const after = applyIntent(scene(), paste!.intent);
    expect(paste!.ids).toHaveLength(3);
    const [a, b, ab] = ['a', 'b', 'ab'].map((id) => after.elements[paste!.ids[['a', 'b', 'ab'].indexOf(id)]]);
    expect(a.center).toEqual({ x: 1, y: 0, z: 1 });
    expect(b.center).toEqual({ x: 3, y: 0, z: 1 });
    expect(ab.source && 'node' in ab.source && ab.source.node).toBe(a.id);
    expect(ab.target && 'node' in ab.target && ab.target.node).toBe(b.id);
    expect(Object.keys(after.elements)).toHaveLength(8);
  });

  test('a paste refuses a fragment placing an object that would contain itself', () => {
    const fragment = layout3D('clipboard', [{ id: 'x', type: 'sphere', object: 'team' }]);
    expect(
      pasteIntent(scene(), fragment, {
        offset: { x: 1, y: 0, z: 1 },
        newId: counter(),
        refuses: (id) => id === 'team',
      }),
    ).toBeUndefined();
  });

  test('a paste refuses a fragment of the other dimension', () => {
    const fragment = layout2D('clipboard', [{ id: 'r', type: 'rect', center: { x: 0, y: 0 } }]);
    expect(pasteIntent(scene(), fragment, { offset: { x: 1, y: 0, z: 1 }, newId: counter() })).toBeUndefined();
  });
});
