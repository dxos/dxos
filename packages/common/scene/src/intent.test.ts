//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { applyIntent, isLayoutIntent, layoutChanges, solidBounds2D, solidOperands } from './intent.ts';
import type * as Scene from './Scene.ts';
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
    ]);
    const after = applyIntent(layout, { kind: 'delete', ids: ['a'] });
    expect(Object.keys(after.elements).sort()).toEqual(['b', 'bc', 'c']);
  });

  test('moving an element of an arranged layout sets pinned', () => {
    const plain = layout3D('l', [cube('a')]);
    const arranged: Scene.LayoutRecord3D = { ...plain, arrange: { kind: 'ring' } };
    const delta = { x: 1, y: 0, z: 0 };
    expect(applyIntent(arranged, { kind: 'move', ids: ['a'], delta }).elements.a.pinned).toBe(true);
    expect(applyIntent(plain, { kind: 'move', ids: ['a'], delta }).elements.a.pinned).toBeUndefined();
  });

  test('an intent naming a missing id returns the layout unchanged', () => {
    const layout = layout3D('l', [cube('a')]);
    expect(applyIntent(layout, { kind: 'move', ids: ['missing'], delta: { x: 1, y: 0, z: 0 } })).toBe(layout);
    expect(applyIntent(layout, { kind: 'update', id: 'missing', path: ['label'], value: 'x' })).toBe(layout);
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
    expect(after.elements.b).toMatchObject({ center: { x: 3, y: 0, z: 0 }, z: 'a5' });
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

  test('a subtraction of several tools is one solid: the base less each of them, in order', () => {
    const intent = { kind: 'subtract', id: 'd', base: 'box', tool: 'hole', tools: ['other'] } as const;
    expect(isLayoutIntent(intent, '3d')).toBe(true);
    const cut = applyIntent(parts(), intent);
    expect(cut.elements.d).toEqual({ id: 'd', type: 'solid', props: { op: 'difference', operands: 'box hole other' } });
    expect([cut.elements.box.hidden, cut.elements.hole.hidden, cut.elements.other.hidden]).toEqual([true, true, true]);
    // Deleted, every one of them is drawn again.
    const restored = applyIntent(cut, { kind: 'delete', ids: ['d'] });
    expect([restored.elements.box.hidden, restored.elements.hole.hidden, restored.elements.other.hidden]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    // A tool that is missing refuses the whole subtraction, as a missing operand does a join.
    const layout = parts();
    expect(applyIntent(layout, { ...intent, tools: ['missing'] })).toBe(layout);
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

  const flat = () =>
    layout2D('f', [
      { id: 'a', type: 'rect', z: 'a1', center: { x: 0, y: 0 }, size: { width: 100, height: 60 } },
      { id: 'b', type: 'ellipse', z: 'a3', center: { x: 60, y: 30 }, size: { width: 80, height: 80 } },
      { id: 'c', type: 'rect', z: 'a2', center: { x: 0, y: 0 }, size: { width: 40, height: 40 }, rotation: 45 },
    ]);

  test('a 2D join is a solid framed by all its operands, on top of them; they are hidden', () => {
    expect(isLayoutIntent({ kind: 'join', id: 'u', operands: ['a', 'b'] }, '2d')).toBe(true);
    const joined = applyIntent(flat(), { kind: 'join', id: 'u', operands: ['a', 'b'] });
    expect(joined.elements.u).toEqual({
      id: 'u',
      type: 'solid',
      z: 'a3',
      center: { x: 25, y: 20 },
      size: { width: 150, height: 100 },
      props: { op: 'union', operands: 'a b' },
    });
    expect([joined.elements.a.hidden, joined.elements.b.hidden, joined.elements.c.hidden]).toEqual([
      true,
      true,
      undefined,
    ]);
    const restored = applyIntent(joined, { kind: 'delete', ids: ['u'] });
    expect([restored.elements.a.hidden, restored.elements.b.hidden]).toEqual([undefined, undefined]);
  });

  test("a 2D subtraction is framed by its base alone, where it was in the stack, and keeps the base's look", () => {
    const styled = applyIntent(flat(), { kind: 'update', id: 'a', path: ['overrides'], value: { hue: 'red' } });
    const cut = applyIntent(styled, { kind: 'subtract', id: 'd', base: 'a', tool: 'b' });
    expect(cut.elements.d).toEqual({
      id: 'd',
      type: 'solid',
      z: 'a1',
      center: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
      overrides: { hue: 'red' },
      props: { op: 'difference', operands: 'a b' },
    });
  });

  test('a 2D subtraction of several tools is still framed by its base', () => {
    const cut = applyIntent(flat(), { kind: 'subtract', id: 'd', base: 'a', tool: 'b', tools: ['c'] });
    expect(cut.elements.d).toMatchObject({
      center: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
      props: { op: 'difference', operands: 'a b c' },
    });
    expect([cut.elements.a.hidden, cut.elements.b.hidden, cut.elements.c.hidden]).toEqual([true, true, true]);
  });

  test('a turned operand is measured as it stands', () => {
    const bounds = solidBounds2D('union', [flat().elements.c]);
    expect(bounds?.width).toBeCloseTo(40 * Math.SQRT2, 2);
    expect(bounds?.x).toBeCloseTo(-20 * Math.SQRT2, 2);
    expect(solidBounds2D('difference', [flat().elements.a, undefined])).toEqual({
      x: -50,
      y: -30,
      width: 100,
      height: 60,
    });
    expect(solidBounds2D('union', [flat().elements.a, { center: { x: 0, y: 0 } }])).toBeUndefined();
  });

  test('operands the layout cannot measure still make a solid, with no frame; nothing is extruded in 2D', () => {
    // Placed objects take their size from the model, which a layout alone does not hold.
    const layout = layout2D('f', [
      { id: 'r', object: 'box', center: { x: 0, y: 0 } },
      { id: 's', object: 'box', center: { x: 50, y: 0 } },
    ]);
    const joined = applyIntent(layout, { kind: 'join', id: 'u', operands: ['r', 's'] });
    expect(joined.elements.u).toEqual({ id: 'u', type: 'solid', props: { op: 'union', operands: 'r s' } });
    expect([joined.elements.r.hidden, joined.elements.s.hidden]).toEqual([true, true]);
    expect(
      isLayoutIntent({ kind: 'extrude', id: 'e', target: 'r', face: { x: 0, y: 1, z: 0 }, distance: 1 }, '2d'),
    ).toBe(false);
  });

  test('the ids a solid names are read from its operands', () => {
    expect(solidOperands('a  b c')).toEqual(['a', 'b', 'c']);
    expect(solidOperands(undefined)).toEqual([]);
  });

  test('a layout intent writes 2D layout fields in the same batch as the elements, and unsets one with undefined', () => {
    const layout = layout2D('l', [{ id: 'a', type: 'rect', center: { x: 0, y: 0 } }]);
    const constraints: Scene.Constraint[] = [{ subject: 'a', relation: 'east', object: 'b' }];
    const lattice = { width: 256, height: 128, gutterX: 128, gutterY: 64 };
    const after = applyIntent(layout, {
      kind: 'batch',
      intents: [
        { kind: 'move', ids: ['a'], delta: { x: 10, y: 0 } },
        { kind: 'layout', patch: { constraints } },
        { kind: 'layout', patch: { lattice } },
      ],
    });
    expect(after.elements.a.center).toEqual({ x: 10, y: 0 });
    expect(after.constraints).toEqual(constraints);
    expect(after.lattice).toEqual(lattice);
    const unset = applyIntent(after, { kind: 'layout', patch: { lattice: undefined } });
    expect('lattice' in unset).toBe(false);
    expect(unset.constraints).toEqual(constraints);
    // A patch to the values already there changes nothing.
    expect(applyIntent(after, { kind: 'layout', patch: { constraints: [...constraints] } })).toBe(after);
  });

  test("a layout intent writes the layout's kind, name and anonymity, so a layout the canvas creates keeps what it is", () => {
    const layout = layout2D('g', []);
    const composite = applyIntent(layout, {
      kind: 'layout',
      patch: { kind: 'composite', anonymous: true, name: 'Group' },
    });
    expect(composite).toMatchObject({ kind: 'composite', anonymous: true, name: 'Group' });
    expect('anonymous' in applyIntent(composite, { kind: 'layout', patch: { anonymous: undefined } })).toBe(false);
  });

  test('layout intents carry 2D fields only', () => {
    const patch = { kind: 'layout', patch: { constraints: [] } };
    expect(isLayoutIntent(patch, '2d')).toBe(true);
    expect(isLayoutIntent(patch, '3d')).toBe(false);
    const solid = layout3D('l', [cube('a')]);
    expect(applyIntent(solid, { kind: 'layout', patch: { constraints: [] } })).toBe(solid);
  });
});

describe('layoutChanges', () => {
  test('one batch takes a 2D layout to another: creates, updates and deletes, and applying it reproduces the target', () => {
    const before = layout2D('l', [
      { id: 'a', type: 'rect', center: { x: 0, y: 0 } },
      { id: 'b', type: 'rect', center: { x: 64, y: 0 } },
    ]);
    const after = layout2D('l', [
      { id: 'a', type: 'rect', center: { x: 32, y: 0 }, dsl: { object: 'pm', element: 'box' } },
      { id: 'c', type: 'ellipse', center: { x: 0, y: 64 } },
    ]);
    const intent = layoutChanges(before.elements, after.elements);
    expect(intent.kind).toBe('batch');
    expect(applyIntent(before, intent).elements).toEqual(after.elements);
    expect(layoutChanges(after.elements, after.elements)).toEqual({ kind: 'batch', intents: [] });
  });

  test('a link re-attached off an element that goes is kept: it is updated before the element is deleted', () => {
    // A and B grouped under G: the link from X that ended at A now ends at G, on the port named by A.
    const before = layout2D('l', [
      { id: 'a', type: 'rect', center: { x: 0, y: 0 } },
      { id: 'b', type: 'rect', center: { x: 64, y: 0 } },
      { id: 'x', type: 'rect', center: { x: 256, y: 0 } },
      { id: 'xa', type: 'link', source: { node: 'x' }, target: { node: 'a' } },
      { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } },
    ]);
    const after = layout2D('l', [
      { id: 'g', type: 'rect', center: { x: 32, y: 0 } },
      { id: 'x', type: 'rect', center: { x: 256, y: 0 } },
      { id: 'xa', type: 'link', source: { node: 'x' }, target: { node: 'g', port: 'a' } },
    ]);
    const applied = applyIntent(before, layoutChanges(before.elements, after.elements)).elements;
    expect(applied).toEqual(after.elements);
    // The link wholly inside the group went with the shapes; the one across its edge did not.
    expect([applied.xa?.target, applied.ab]).toEqual([{ node: 'g', port: 'a' }, undefined]);
  });

  test('the same helper diffs 3D layouts, so both dimensions write through one intent vocabulary', () => {
    const before = layout3D('l', [cube('a'), cube('b', 1)]);
    const after = layout3D('l', [cube('a', 2)]);
    expect(applyIntent(before, layoutChanges(before.elements, after.elements)).elements).toEqual(after.elements);
  });
});
