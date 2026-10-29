//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { resolveLayout3D } from './document.ts';
import { applyModelIntent } from './model-intent.ts';
import type * as Scene from './Scene.ts';
import { layout3D, model3D, scene3D } from './testing.ts';
import { validateDocument } from './validate.ts';

const doc = (): Scene.SceneDocument => ({
  scenes: [scene3D('s', 'root')],
  layouts: [
    layout3D(
      'root',
      [
        { id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'b', kind: 'cube', center: { x: 2, y: 0, z: 0 } },
        { id: 'c', object: 'chair', center: { x: 4, y: 0, z: 0 } },
        { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } },
        { id: 'bc', kind: 'link', from: { element: 'b' }, to: { element: 'c' } },
      ],
      'm',
    ),
  ],
  models: [model3D('m', [{ id: 'chair', kind: 'cube' }])],
});

describe('applyModelIntent', () => {
  test('define adds an object, and update changes it, both as valid documents', () => {
    const defined = applyModelIntent(doc(), { kind: 'define', model: 'm', object: { id: 'lamp', kind: 'cylinder' } });
    expect(defined.problems).toEqual([]);
    expect(defined.doc.models[0].objects.lamp).toEqual({ id: 'lamp', kind: 'cylinder' });
    const updated = applyModelIntent(defined.doc, {
      kind: 'update',
      model: 'm',
      id: 'lamp',
      path: ['style', 'hue'],
      value: 'amber',
    });
    expect(updated.doc.models[0].objects.lamp.style).toEqual({ hue: 'amber' });
    expect(validateDocument(updated.doc)).toEqual([]);
  });

  test('remove of an object an element still places returns a problem and changes nothing', () => {
    const before = doc();
    const removed = applyModelIntent(before, { kind: 'remove', model: 'm', id: 'chair' });
    expect(removed.problems).toHaveLength(1);
    expect(removed.doc).toBe(before);
    const unplaced = applyModelIntent(
      applyModelIntent(before, { kind: 'define', model: 'm', object: { id: 'lamp', kind: 'cylinder' } }).doc,
      { kind: 'remove', model: 'm', id: 'lamp' },
    );
    expect(unplaced.problems).toEqual([]);
    expect(unplaced.doc.models[0].objects.lamp).toBeUndefined();
  });

  test('extract turns two elements into one placing a new object whose parts hold both, links kept', () => {
    const { doc: after, problems } = applyModelIntent(doc(), {
      kind: 'extract',
      model: 'm',
      layout: 'root',
      ids: ['a', 'b'],
      object: { id: 'pair', kind: 'sphere' },
    });
    expect(problems).toEqual([]);
    const parts = after.layouts.find((layout) => layout.id === 'pair-parts');
    expect(Object.keys(parts?.elements ?? {}).sort()).toEqual(['a', 'ab', 'b']);
    const root = after.layouts.find((layout) => layout.id === 'root');
    if (root?.dim !== '3d') {
      throw new Error('The root layout is 3D.');
    }
    const placing = Object.values(root.elements).filter((element) => element.object === 'pair');
    expect(placing).toHaveLength(1);
    expect(placing[0].center).toEqual({ x: 1, y: 0, z: 0 });
    // A link that crossed out of the extracted elements now ends at the element placing them.
    expect(root.elements.bc.from).toEqual({ element: placing[0].id });
    expect(resolveLayout3D(after, root)[placing[0].id].parts).toBe('pair-parts');
    expect(after.models[0].objects.pair).toEqual({ id: 'pair', kind: 'sphere', parts: 'pair-parts' });
    expect(validateDocument(after)).toEqual([]);
  });

  test('an intent naming a missing model or object returns a problem', () => {
    expect(
      applyModelIntent(doc(), { kind: 'update', model: 'm', id: 'missing', path: ['kind'], value: 'x' }).problems,
    ).toHaveLength(1);
    expect(
      applyModelIntent(doc(), { kind: 'define', model: 'missing', object: { id: 'x', kind: 'cube' } }).problems,
    ).toHaveLength(1);
  });
});
