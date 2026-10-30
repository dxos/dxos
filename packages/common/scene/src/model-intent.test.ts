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
        { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'b', type: 'cube', center: { x: 2, y: 0, z: 0 } },
        { id: 'c', object: 'chair', center: { x: 4, y: 0, z: 0 } },
        { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } },
        { id: 'bc', type: 'link', source: { node: 'b' }, target: { node: 'c' } },
      ],
      'm',
    ),
  ],
  models: [model3D('m', [{ id: 'chair', type: 'cube' }])],
});

describe('applyModelIntent', () => {
  test('define adds an object, and update changes it, both as valid documents', () => {
    const defined = applyModelIntent(doc(), { kind: 'define', model: 'm', object: { id: 'lamp', type: 'cylinder' } });
    expect(defined.problems).toEqual([]);
    expect(defined.doc.models[0].objects.lamp).toEqual({ id: 'lamp', type: 'cylinder' });
    const updated = applyModelIntent(defined.doc, {
      kind: 'update',
      model: 'm',
      id: 'lamp',
      path: ['overrides', 'hue'],
      value: 'amber',
    });
    expect(updated.doc.models[0].objects.lamp.overrides).toEqual({ hue: 'amber' });
    expect(validateDocument(updated.doc)).toEqual([]);
  });

  test('remove of an object an element still places returns a problem and changes nothing', () => {
    const before = doc();
    const removed = applyModelIntent(before, { kind: 'remove', model: 'm', id: 'chair' });
    expect(removed.problems).toHaveLength(1);
    expect(removed.doc).toBe(before);
    const unplaced = applyModelIntent(
      applyModelIntent(before, { kind: 'define', model: 'm', object: { id: 'lamp', type: 'cylinder' } }).doc,
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
      object: { id: 'pair', type: 'sphere' },
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
    expect(root.elements.bc.source).toEqual({ node: placing[0].id });
    expect(resolveLayout3D(after, root)[placing[0].id].parts).toBe('pair-parts');
    expect(after.models[0].objects.pair).toEqual({ id: 'pair', type: 'sphere', parts: 'pair-parts' });
    expect(validateDocument(after)).toEqual([]);
  });

  test('an intent naming a missing model or object returns a problem', () => {
    expect(
      applyModelIntent(doc(), { kind: 'update', model: 'm', id: 'missing', path: ['kind'], value: 'x' }).problems,
    ).toHaveLength(1);
    expect(
      applyModelIntent(doc(), { kind: 'define', model: 'missing', object: { id: 'x', type: 'cube' } }).problems,
    ).toHaveLength(1);
  });

  test('extract keeps links whole: a selected link with an end left outside stays, bound to the new element', () => {
    const { doc: after, problems } = applyModelIntent(doc(), {
      kind: 'extract',
      model: 'm',
      layout: 'root',
      ids: ['a', 'b', 'bc'],
      object: { id: 'pair', type: 'sphere' },
    });
    expect(problems).toEqual([]);
    const parts = after.layouts.find((layout) => layout.id === 'pair-parts');
    expect(Object.keys(parts?.elements ?? {}).sort()).toEqual(['a', 'ab', 'b']);
    const host = after.layouts.find((layout) => layout.id === 'root');
    expect(host?.elements.bc?.source).toEqual({ node: 'pair' });
  });

  test('group makes an anonymous composite placed with no fit; links from outside end on its ports; ungroup undoes it', () => {
    const grouped = applyModelIntent(doc(), {
      kind: 'group',
      model: 'm',
      layout: 'root',
      id: 'g',
      members: ['a', 'b'],
      arrange: { kind: 'ring' },
    });
    expect(grouped.problems).toEqual([]);
    const parts = grouped.doc.layouts.find((layout) => layout.id === 'root/g');
    expect(parts).toMatchObject({ kind: 'composite', anonymous: true, arrange: { kind: 'ring' }, model: 'm' });
    expect(Object.keys(parts?.elements ?? {}).sort()).toEqual(['a', 'ab', 'b']);
    expect(grouped.doc.models[0].objects['root/g']).toEqual({ id: 'root/g', type: 'group', parts: 'root/g' });
    const host = grouped.doc.layouts.find((layout) => layout.id === 'root');
    expect(host?.elements.g).toEqual({ id: 'g', object: 'root/g', fit: 'none' });
    expect(host?.elements.bc?.source).toEqual({ node: 'g', port: 'b' });

    const ungrouped = applyModelIntent(grouped.doc, { kind: 'ungroup', model: 'm', layout: 'root', id: 'g' });
    expect(ungrouped.problems).toEqual([]);
    expect(ungrouped.doc.layouts.map((layout) => layout.id)).toEqual(['root']);
    expect(ungrouped.doc.models[0].objects['root/g']).toBeUndefined();
    expect(ungrouped.doc.layouts[0].elements.bc?.source).toEqual({ node: 'b' });
    expect(Object.keys(ungrouped.doc.layouts[0].elements).sort()).toEqual(['a', 'ab', 'b', 'bc', 'c']);
  });
});
