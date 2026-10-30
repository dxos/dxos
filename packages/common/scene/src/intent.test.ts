//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { applyIntent, isLayoutIntent } from './intent.ts';
import { layout2D, layout3D } from './testing.ts';

const cube = (id: string, x = 0) => ({ id, type: 'cube', center: { x, y: 0, z: 0 } });

describe('applyIntent', () => {
  test('move adds a Vec3 delta to each 3D center and rounds to 0.001', () => {
    const layout = layout3D('l', [cube('a'), cube('b', 1)]);
    const moved = applyIntent(layout, { kind: 'move', ids: ['a', 'b'], delta: { x: 0.1 + 0.2, y: 1, z: -2 } });
    expect(moved.elements.a.center).toEqual({ x: 0.3, y: 1, z: -2 });
    expect(moved.elements.b.center).toEqual({ x: 1.3, y: 1, z: -2 });
  });

  test('rotate adds Euler degrees; scale multiplies per axis', () => {
    const layout = layout3D('l', [{ ...cube('a'), rotation: { x: 0, y: 10, z: 0 }, scale: { x: 1, y: 2, z: 1 } }]);
    const rotated = applyIntent(layout, { kind: 'rotate', ids: ['a'], delta: { x: 0, y: 35, z: 5 } });
    expect(rotated.elements.a.rotation).toEqual({ x: 0, y: 45, z: 5 });
    const scaled = applyIntent(layout, { kind: 'scale', ids: ['a'], factor: { x: 2, y: 0.5, z: 3 } });
    expect(scaled.elements.a.scale).toEqual({ x: 2, y: 1, z: 3 });
    const flat = layout2D('f', [{ id: 'r', type: 'rect', size: { width: 128, height: 64 }, rotation: 0 }]);
    expect(applyIntent(flat, { kind: 'rotate', ids: ['r'], delta: 90 }).elements.r.rotation).toBe(90);
    expect(applyIntent(flat, { kind: 'scale', ids: ['r'], factor: { width: 2, height: 2 } }).elements.r.size).toEqual({
      width: 256,
      height: 128,
    });
  });

  test('delete removes the elements and every link bound to them', () => {
    const layout = layout3D('l', [
      cube('a'),
      cube('b'),
      cube('c'),
      { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } },
      { id: 'bc', type: 'link', source: { node: 'b' }, target: { node: 'c' } },
      { id: 'g', type: 'group', members: ['a', 'c'] },
    ]);
    const after = applyIntent(layout, { kind: 'delete', ids: ['a'] });
    expect(Object.keys(after.elements).sort()).toEqual(['b', 'bc', 'c', 'g']);
    expect(after.elements.g.members).toEqual(['c']);
  });

  test('group adds a group element over its members; ungroup removes it and keeps the members', () => {
    const layout = layout3D('l', [cube('a'), cube('b')]);
    const grouped = applyIntent(layout, {
      kind: 'group',
      id: 'g',
      members: ['a', 'b'],
      arrange: { kind: 'ring' },
    });
    expect(grouped.elements.g).toEqual({ id: 'g', type: 'group', members: ['a', 'b'], arrange: { kind: 'ring' } });
    const ungrouped = applyIntent(grouped, { kind: 'ungroup', id: 'g' });
    expect(Object.keys(ungrouped.elements).sort()).toEqual(['a', 'b']);
  });

  test('moving an arranged member sets pinned', () => {
    const layout = layout3D('l', [
      cube('a'),
      cube('b'),
      { id: 'g', type: 'group', members: ['a'], arrange: { kind: 'ring' } },
    ]);
    const moved = applyIntent(layout, { kind: 'move', ids: ['a', 'b'], delta: { x: 1, y: 0, z: 0 } });
    expect(moved.elements.a.pinned).toBe(true);
    expect(moved.elements.b.pinned).toBeUndefined();
  });

  test('an intent naming a missing id returns the layout unchanged', () => {
    const layout = layout3D('l', [cube('a')]);
    expect(applyIntent(layout, { kind: 'move', ids: ['missing'], delta: { x: 1, y: 0, z: 0 } })).toBe(layout);
    expect(applyIntent(layout, { kind: 'update', id: 'missing', path: ['label'], value: 'x' })).toBe(layout);
    expect(applyIntent(layout, { kind: 'ungroup', id: 'a' })).toBe(layout);
  });

  test('update writes a nested path, and unsets it with no value', () => {
    const layout = layout3D('l', [{ ...cube('a'), overrides: { hue: 'blue' } }]);
    const updated = applyIntent(layout, { kind: 'update', id: 'a', path: ['overrides', 'hue'], value: 'red' });
    expect(updated.elements.a.overrides).toEqual({ hue: 'red' });
    expect(applyIntent(updated, { kind: 'update', id: 'a', path: ['overrides', 'hue'] }).elements.a.overrides).toEqual(
      {},
    );
  });

  test('isLayoutIntent refuses a 2D delta on a 3D move', () => {
    expect(isLayoutIntent({ kind: 'move', ids: ['a'], delta: { x: 1, y: 2 } }, '3d')).toBe(false);
    expect(isLayoutIntent({ kind: 'move', ids: ['a'], delta: { x: 1, y: 2, z: 3 } }, '3d')).toBe(true);
    expect(isLayoutIntent({ kind: 'move', ids: ['a'], delta: { x: 1, y: 2 } }, '2d')).toBe(true);
    expect(isLayoutIntent({ kind: 'nonsense' })).toBe(false);
  });

  test('batch applies its intents in order', () => {
    const layout = layout3D('l', [cube('a')]);
    const after = applyIntent(layout, {
      kind: 'batch',
      intents: [
        { kind: 'create', element: cube('b', 2) },
        { kind: 'move', ids: ['b'], delta: { x: 1, y: 0, z: 0 } },
        { kind: 'reorder', id: 'b', order: 'a5' },
      ],
    });
    expect(after.elements.b).toMatchObject({ center: { x: 3, y: 0, z: 0 }, order: 'a5' });
  });

  test('create of an element placing an object keeps object and sets no kind', () => {
    const layout = layout3D('l', []);
    const after = applyIntent(layout, {
      kind: 'create',
      element: { id: 'p', object: 'chair', center: { x: 0, y: 0, z: 0 } },
    });
    expect(after.elements.p).toEqual({ id: 'p', object: 'chair', center: { x: 0, y: 0, z: 0 } });
  });

  test('bind adds a link between two elements, and refuses one bound to a missing element', () => {
    const layout = layout3D('l', [cube('a'), cube('b')]);
    const link = { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } };
    expect(applyIntent(layout, { kind: 'bind', link }).elements.ab).toEqual(link);
    expect(applyIntent(layout, { kind: 'bind', link: { ...link, target: { node: 'missing' } } })).toBe(layout);
  });

  test('a move of a 3D element with no centre places it at the delta, where it was drawn from', () => {
    const layout = layout3D('l', [{ id: 's', type: 'solid' }]);
    expect(applyIntent(layout, { kind: 'move', ids: ['s'], delta: { x: 1, y: 2, z: 3 } }).elements.s.center).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
  });
});

describe('solid intents', () => {
  const parts = () =>
    layout3D('l', [
      cube('box'),
      { id: 'hole', type: 'cylinder', center: { x: 0, y: 0, z: 0 } },
      { id: 'other', type: 'sphere', center: { x: 2, y: 0, z: 0 } },
    ]);

  test('join and subtract add a solid over their operands and hide them', () => {
    const joined = applyIntent(parts(), { kind: 'join', id: 'u', operands: ['box', 'other'] });
    expect(joined.elements.u).toEqual({ id: 'u', type: 'solid', props: { op: 'union', operands: 'box other' } });
    expect(joined.elements.box.hidden).toBe(true);
    expect(joined.elements.other.hidden).toBe(true);
    const cut = applyIntent(parts(), { kind: 'subtract', id: 'd', base: 'box', tool: 'hole' });
    expect(cut.elements.d).toEqual({ id: 'd', type: 'solid', props: { op: 'difference', operands: 'box hole' } });
    expect([cut.elements.box.hidden, cut.elements.hole.hidden, cut.elements.other.hidden]).toEqual([
      true,
      true,
      undefined,
    ]);
  });

  test("a solid takes its base operand's style, so a subtraction keeps the colour it was cut from", () => {
    const styled = applyIntent(parts(), {
      kind: 'update',
      id: 'box',
      path: ['overrides'],
      value: { hue: 'red', tone: 2 },
    });
    expect(applyIntent(styled, { kind: 'subtract', id: 'd', base: 'box', tool: 'hole' }).elements.d.overrides).toEqual({
      hue: 'red',
      tone: 2,
    });
    expect(applyIntent(styled, { kind: 'join', id: 'u', operands: ['box', 'other'] }).elements.u.overrides).toEqual({
      hue: 'red',
      tone: 2,
    });
    expect(
      applyIntent(parts(), { kind: 'join', id: 'u', operands: ['box', 'other'] }).elements.u.style,
    ).toBeUndefined();
  });

  test('extrude adds a solid over its target with the face and distance', () => {
    const after = applyIntent(parts(), {
      kind: 'extrude',
      id: 'e',
      target: 'box',
      face: { x: 0, y: 1, z: 0 },
      distance: 0.5,
    });
    expect(after.elements.e).toEqual({
      id: 'e',
      type: 'solid',
      props: { op: 'extrude', target: 'box', face: { x: 0, y: 1, z: 0 }, distance: 0.5 },
    });
    expect(after.elements.box.hidden).toBe(true);
  });

  test('deleting a solid shows its operands again, unless another solid still uses them', () => {
    const joined = applyIntent(parts(), { kind: 'join', id: 'u', operands: ['box', 'other'] });
    const both = applyIntent(joined, {
      kind: 'extrude',
      id: 'e',
      target: 'box',
      face: { x: 1, y: 0, z: 0 },
      distance: 1,
    });
    const after = applyIntent(both, { kind: 'delete', ids: ['u'] });
    expect(after.elements.other.hidden).toBeUndefined();
    expect(after.elements.box.hidden).toBe(true);
  });

  test('a solid naming itself, a missing operand or an existing id is refused', () => {
    const layout = parts();
    expect(applyIntent(layout, { kind: 'join', id: 'u', operands: ['box', 'u'] })).toBe(layout);
    expect(applyIntent(layout, { kind: 'join', id: 'u', operands: ['box', 'missing'] })).toBe(layout);
    expect(applyIntent(layout, { kind: 'subtract', id: 'box', base: 'other', tool: 'hole' })).toBe(layout);
    expect(applyIntent(layout, { kind: 'join', id: 'u', operands: [] })).toBe(layout);
  });

  test('solid intents are 3D only', () => {
    const flat = layout2D('f', [{ id: 'r', type: 'rect' }]);
    expect(isLayoutIntent({ kind: 'join', id: 'u', operands: ['r'] }, '2d')).toBe(false);
    expect(applyIntent(flat, { kind: 'join', id: 'u', operands: ['r'] })).toBe(flat);
  });
});
