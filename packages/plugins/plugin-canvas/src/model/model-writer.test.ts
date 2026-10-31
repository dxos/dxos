//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Scene } from '@dxos/scene';

import types from '../capabilities/schema.ts';
import { canvasDocument, makeCanvas } from './canvas-document.ts';
import { applyLayoutIntent } from './layout-source.ts';
import { writeDocument, writeModelIntent } from './model-writer.ts';

describe('writeModelIntent', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const canvas3D = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(types);
    const made = makeCanvas({ dimension: '3d' });
    [made.model, made.layout, made.scene, made.canvas].forEach((object) => db.add(object));
    const layout = made.layout;
    if (!Obj.instanceOf(Scene.Layout3D, layout)) {
      throw new Error('A 3D canvas has a 3D layout.');
    }
    applyLayoutIntent(layout, {
      kind: 'batch',
      intents: [
        { kind: 'create', element: { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } } },
        { kind: 'create', element: { id: 'b', type: 'cube', center: { x: 2, y: 0, z: 0 } } },
      ],
    });
    return { ...made, layout, db };
  };

  test('define writes an object into the stored model', async () => {
    const { canvas, model } = await canvas3D();
    expect(
      writeModelIntent(canvas, { kind: 'define', model: 'model', object: { id: 'lamp', type: 'cylinder' } }),
    ).toEqual([]);
    expect(Obj.instanceOf(Scene.Model3D, model) && model.objects.lamp).toMatchObject({ type: 'cylinder' });
  });

  test('define stores only the fields an object has, so a record carrying others (a label) still writes', async () => {
    const { canvas, model } = await canvas3D();
    const object = {
      id: 'crate',
      type: 'mesh',
      label: 'Crate',
      props: { mesh: { key: 'k', positions: [0, 0, 0], indices: [0, 0, 0] } },
    };
    expect(writeModelIntent(canvas, { kind: 'define', model: 'model', object })).toEqual([]);
    const stored = Obj.instanceOf(Scene.Model3D, model) ? model.objects.crate : undefined;
    expect(stored).toMatchObject({ id: 'crate', type: 'mesh' });
    expect(stored && 'label' in stored).toBe(false);
  });

  test('extract stores the parts layout, lists it on the canvas, and Refs it from the new object', async () => {
    const { canvas, model, layout } = await canvas3D();
    const problems = writeModelIntent(canvas, {
      kind: 'extract',
      model: 'model',
      layout: 'layout',
      ids: ['a', 'b'],
      object: { id: 'pair', type: 'sphere' },
    });
    expect(problems).toEqual([]);
    const parts = canvas.layouts
      .map((ref) => ref.target)
      .find((target) => Obj.instanceOf(Scene.Layout3D, target) && target.key === 'pair-parts');
    expect(Obj.instanceOf(Scene.Layout3D, parts) && Object.keys(parts.elements).sort()).toEqual(['a', 'b']);
    expect(Obj.instanceOf(Scene.Model3D, model) && model.objects.pair.parts?.target).toBe(parts);
    expect(Object.values(layout.elements).map((element) => element.object)).toEqual(['pair']);
    expect(
      canvasDocument(canvas)
        .layouts.map((record) => record.id)
        .sort(),
    ).toEqual(['layout', 'pair-parts']);
  });

  test('writing back the document from before an extract undoes it, and the one after redoes it', async () => {
    const { canvas, layout } = await canvas3D();
    const before = canvasDocument(canvas);
    writeModelIntent(canvas, {
      kind: 'extract',
      model: 'model',
      layout: 'layout',
      ids: ['a', 'b'],
      object: { id: 'pair', type: 'sphere' },
    });
    const after = canvasDocument(canvas);
    writeDocument(canvas, before);
    expect(canvasDocument(canvas).layouts.map((record) => record.id)).toEqual(['layout']);
    expect(Object.keys(layout.elements).sort()).toEqual(['a', 'b']);
    expect(canvasDocument(canvas).models[0]?.objects.pair).toBeUndefined();
    writeDocument(canvas, after);
    expect(
      canvasDocument(canvas)
        .layouts.map((record) => record.id)
        .sort(),
    ).toEqual(['layout', 'pair-parts']);
    expect(Object.values(layout.elements).map((element) => element.object)).toEqual(['pair']);
  });

  test('extract on a layout with no model gives it the model its new element places from', async () => {
    const { canvas, model, layout } = await canvas3D();
    Obj.update(layout, (layout) => {
      layout.model = undefined;
    });
    expect(
      writeModelIntent(canvas, {
        kind: 'extract',
        model: 'model',
        layout: 'layout',
        ids: ['a'],
        object: { id: 'one', type: 'sphere' },
      }),
    ).toEqual([]);
    expect(layout.model?.target).toBe(model);
  });

  test('a refused intent writes nothing and returns its problems', async () => {
    const { canvas, layout } = await canvas3D();
    const before = Obj.version(layout).automergeHeads;
    expect(writeModelIntent(canvas, { kind: 'remove', model: 'model', id: 'missing' })).toHaveLength(1);
    expect(Obj.version(layout).automergeHeads).toEqual(before);
  });
});
