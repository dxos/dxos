//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Scene } from '@dxos/scene';

import types from '../capabilities/schema.ts';
import {
  addScene,
  canvasDimension,
  canvasDocument,
  deleteScene,
  makeCanvas,
  openScene,
  removeCanvas,
} from './canvas-document.ts';

describe('canvas document', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('makeCanvas makes a Canvas over one model, layout and scene; dimension 3d makes 3D ones', () => {
    const { canvas, model, layout, scene } = makeCanvas({ lattice: true });
    expect(canvas.settings).toEqual({ lattice: true });
    expect(Obj.instanceOf(Scene.Model2D, model)).toBe(true);
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.model?.target).toBe(model);
    expect(Obj.instanceOf(Scene.Scene2D, scene) && scene.layout.target).toBe(layout);
    expect(openScene(canvas)).toBe(scene);
    expect(canvas.layouts.map((ref) => ref.target)).toEqual([layout]);

    const solid = makeCanvas({ dimension: '3d' });
    expect(Obj.instanceOf(Scene.Scene3D, solid.scene)).toBe(true);
    expect(Obj.instanceOf(Scene.Layout3D, solid.layout)).toBe(true);
    expect(Obj.instanceOf(Scene.Model3D, solid.model)).toBe(true);
  });

  test('a 3D canvas opens a Scene3D over a Layout3D, and its dimension picks the 3D article', () => {
    const { canvas, scene, layout } = makeCanvas({ dimension: '3d' });
    expect(Obj.instanceOf(Scene.Scene3D, openScene(canvas))).toBe(true);
    expect(Obj.instanceOf(Scene.Scene3D, scene) && scene.layout.target === layout).toBe(true);
    expect(Obj.instanceOf(Scene.Layout3D, layout)).toBe(true);
    expect(canvasDimension(canvas)).toBe('3d');
    expect(canvasDimension(makeCanvas().canvas)).toBe('2d');
  });

  test('canvasDocument reads every scene, layout and model of the canvas', () => {
    const { canvas, layout } = makeCanvas();
    const loose = Obj.make(Scene.Layout2D, { key: 'loose', elements: {} });
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('A 2D canvas has a 2D layout.');
    }
    const zoomed = Obj.make(Scene.Scene2D, {
      key: 'zoomed',
      layout: Ref.make(layout),
      camera: { center: { x: 0, y: 0 }, zoom: 2 },
    });
    Obj.update(canvas, (canvas) => {
      canvas.layouts.push(Ref.make(loose));
      canvas.scenes.push(Ref.make(zoomed));
    });
    const doc = canvasDocument(canvas);
    expect(doc.scenes.map((scene) => scene.id)).toEqual([openScene(canvas)?.key, 'zoomed']);
    expect(doc.layouts.map((layout) => layout.id)).toContain('loose');
    expect(doc.models).toHaveLength(1);
  });

  test('deleteScene keeps a layout another scene still uses', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(types);
    const { canvas, model, layout, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('A 2D canvas has a 2D layout.');
    }
    const zoomed = Obj.make(Scene.Scene2D, {
      key: 'zoomed',
      layout: Ref.make(layout),
      camera: { center: { x: 0, y: 0 }, zoom: 2 },
    });
    [model, layout, scene, zoomed].forEach((object) => db.add(object));
    db.add(canvas);
    Obj.update(canvas, (canvas) => {
      canvas.scenes.push(Ref.make(zoomed));
    });
    await db.flush();

    deleteScene(canvas, scene);
    expect(canvas.scenes.map((ref) => ref.target)).toEqual([zoomed]);
    expect(canvas.layouts.map((ref) => ref.target)).toEqual([layout]);

    deleteScene(canvas, zoomed);
    expect(canvas.scenes).toHaveLength(0);
    expect(canvas.layouts).toHaveLength(0);
    await db.flush();
    expect(await db.query(Filter.type(Scene.Layout2D)).run()).toHaveLength(0);
  });

  test('deleteScene keeps a layout a composite object shows as its parts', () => {
    const { canvas, model, layout, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Layout2D, layout) || !Obj.instanceOf(Scene.Model2D, model)) {
      throw new Error('A 2D canvas has 2D objects.');
    }
    Obj.update(model, (model) => {
      model.objects.frame = { id: 'frame', kind: 'rect', parts: Ref.make(layout) };
    });
    deleteScene(canvas, scene);
    expect(canvas.layouts.map((ref) => ref.target)).toEqual([layout]);
  });

  test("deleteScene keeps a layout a composite object of another layout's model shows", () => {
    const { canvas, layout, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('A 2D canvas has a 2D layout.');
    }
    // A model a write attached to a parts layout, which the canvas does not list as its own.
    const other = Obj.make(Scene.Model2D, {
      key: 'other',
      objects: { frame: { id: 'frame', kind: 'rect', parts: Ref.make(layout) } },
    });
    const holder = Obj.make(Scene.Layout2D, { key: 'holder', model: Ref.make(other), elements: {} });
    Obj.update(canvas, (canvas) => {
      canvas.layouts.push(Ref.make(holder));
    });
    deleteScene(canvas, scene);
    expect(canvas.layouts.map((ref) => ref.target)).toContain(layout);
  });

  test('removeCanvas removes the canvas with its model, layouts and scenes', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(types);
    const { canvas, model, layout, scene } = makeCanvas();
    [model, layout, scene, canvas].forEach((object) => db.add(object));
    await db.flush();
    removeCanvas(canvas);
    await db.flush();
    expect(await db.query(Filter.type(Scene.Layout2D)).run()).toHaveLength(0);
    expect(await db.query(Filter.type(Scene.Scene2D)).run()).toHaveLength(0);
    expect(await db.query(Filter.type(Scene.Model2D)).run()).toHaveLength(0);
  });

  test('adding a scene keeps one layout and two cameras', () => {
    const { canvas, layout, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('A 2D canvas opens a 2D scene.');
    }
    const added = addScene(canvas, scene, { center: { x: 10, y: 20 }, zoom: 2 });
    expect(canvas.scenes.map((ref) => ref.target)).toEqual([scene, added]);
    expect(canvas.layouts.map((ref) => ref.target)).toEqual([layout]);
    expect(added.layout.target).toBe(layout);
    expect([scene.camera.zoom, added.camera.zoom]).toEqual([1, 2]);
  });

  test('a 3D canvas adds a scene over its layout, as 2D does, with its own camera', () => {
    const { canvas, layout, scene } = makeCanvas({ dimension: '3d' });
    if (!Obj.instanceOf(Scene.Scene3D, scene)) {
      throw new Error('A 3D canvas opens a 3D scene.');
    }
    const added = addScene(canvas, scene, { ...scene.camera, yaw: 90 });
    expect(Obj.instanceOf(Scene.Scene3D, added)).toBe(true);
    expect(added.layout.target).toBe(layout);
    expect(canvas.scenes.map((ref) => ref.target)).toEqual([scene, added]);
  });

  test('a viewer opens the scene it picked, by key; an unknown key opens the first', () => {
    const { canvas, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('A 2D canvas opens a 2D scene.');
    }
    const added = addScene(canvas, scene, { center: { x: 0, y: 0 }, zoom: 2 });
    expect(openScene(canvas, added.key)).toBe(added);
    expect(openScene(canvas, 'gone')).toBe(scene);
    expect(openScene(canvas)).toBe(scene);
  });

  test("a stored scene's own camera starts the added scene, copied rather than shared", async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(types);
    const { canvas, model, layout, scene } = makeCanvas({ dimension: '3d' });
    [model, layout, scene, canvas].forEach((object) => db.add(object));
    if (!Obj.instanceOf(Scene.Scene3D, scene)) {
      throw new Error('A 3D canvas opens a 3D scene.');
    }
    const added = addScene(canvas, scene, scene.camera);
    expect(added.camera).toEqual(scene.camera);
    expect(canvas.scenes).toHaveLength(2);
  });
});
