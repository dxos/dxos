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
import { writeModelIntent } from './model-writer.ts';

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
        { kind: 'create', element: { id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } } },
        { kind: 'create', element: { id: 'b', kind: 'cube', center: { x: 2, y: 0, z: 0 } } },
      ],
    });
    return { ...made, layout, db };
  };

  test('define writes an object into the stored model', async () => {
    const { canvas, model } = await canvas3D();
    expect(
      writeModelIntent(canvas, { kind: 'define', model: 'model', object: { id: 'lamp', kind: 'cylinder' } }),
    ).toEqual([]);
    expect(Obj.instanceOf(Scene.Model3D, model) && model.objects.lamp).toMatchObject({ kind: 'cylinder' });
  });

  test('extract stores the parts layout, lists it on the canvas, and Refs it from the new object', async () => {
    const { canvas, model, layout } = await canvas3D();
    const problems = writeModelIntent(canvas, {
      kind: 'extract',
      model: 'model',
      layout: 'layout',
      ids: ['a', 'b'],
      object: { id: 'pair', kind: 'sphere' },
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

  test('a refused intent writes nothing and returns its problems', async () => {
    const { canvas, layout } = await canvas3D();
    const before = Obj.version(layout).automergeHeads;
    expect(writeModelIntent(canvas, { kind: 'remove', model: 'model', id: 'missing' })).toHaveLength(1);
    expect(Obj.version(layout).automergeHeads).toEqual(before);
  });
});
