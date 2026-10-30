//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { Obj } from '@dxos/echo';
import { type View, type ViewMap, createNode } from '@dxos/react-ui-canvas/headless';
import { toCanvasView } from '@dxos/react-ui-scene/canvas';
import { Scene, fromEcho, toEcho } from '@dxos/scene';

import { type Canvas } from '#types';

import { makeCanvas } from './canvas-document.ts';
import { makeLayoutWriter } from './layout-writer.ts';

/** A 2D exemplar in ECHO form, its root narrowed to the Scene2D it is. */
const stored = (name: keyof typeof EXEMPLARS) => {
  const document = toEcho(Dsl.readScenes(EXEMPLARS[name]).document);
  const root = document.root;
  if (!Obj.instanceOf(Scene.Scene2D, root)) {
    throw new Error(`${name} is not a 2D exemplar.`);
  }
  return { ...document, root };
};

/** A 2D scene's layouts read as the engine's Views, by layout key, with the scene's own layout as the root. */
const sceneViews = (scene: Scene.Scene2D): { root: string; views: ViewMap } => {
  const doc = fromEcho(scene);
  return {
    root: scene.layout.target?.key ?? scene.key,
    views: Object.fromEntries(
      doc.layouts.flatMap((layout) => (layout.dim === '2d' ? [[layout.id, toCanvasView(doc, layout)]] : [])),
    ),
  };
};

const moveNode = (view: View, id: string, center: { x: number; y: number }): View => ({
  ...view,
  nodes: { ...view.nodes, [id]: { ...view.nodes[id], center } },
});

describe('makeLayoutWriter', () => {
  test('an unchanged element is not rewritten when another moves', () => {
    const { root: scene, layouts } = stored('links');
    const layout = layouts.get('links');
    const before = Obj.instanceOf(Scene.Layout2D, layout) ? JSON.stringify(layout.elements.b) : '';
    const { root, views } = sceneViews(scene);
    makeLayoutWriter(scene).write({ ...views, [root]: moveNode(views[root], 'a', { x: 64, y: 64 }) }, views);
    expect(Obj.instanceOf(Scene.Layout2D, layout) && JSON.stringify(layout.elements.b)).toBe(before);
  });

  test('a moved element that places a model object keeps placing it', () => {
    const { root: scene, layouts } = stored('links');
    const { root, views } = sceneViews(scene);
    makeLayoutWriter(scene).write({ ...views, [root]: moveNode(views[root], 'b', { x: 320, y: 64 }) }, views);
    const layout = layouts.get('links');
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.b).toMatchObject({
      object: 'box',
      center: { x: 320, y: 64 },
      overrides: { hue: 'green' },
    });
    // The size and the rest of the style are still the object's.
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.b.size).toBeUndefined();
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.b.overrides).toEqual({ hue: 'green' });
  });

  test('a portal and its View a write makes are listed on the canvas, and removed with the portal', () => {
    const layoutKeys = (canvas: Canvas.Canvas) =>
      canvas.layouts.flatMap((ref) => (Obj.instanceOf(Scene.Layout2D, ref.target) ? [ref.target.key] : []));
    const { canvas, layout, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Layout2D, layout) || !Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('A 2D canvas has 2D objects.');
    }
    // A canvas migrated without portals has no model until a write places one.
    Obj.update(layout, (layout) => {
      layout.model = undefined;
    });
    Obj.update(canvas, (canvas) => {
      canvas.model = undefined;
    });
    const writer = makeLayoutWriter(scene, { canvas });
    const { root, views } = sceneViews(scene);
    const size = { width: 128, height: 128 };
    const inner: View = {
      id: 'g',
      nodes: { x: createNode({ type: 'rect', id: 'x', z: 'a0', center: { x: 0, y: 0 }, size }) },
      links: {},
    };
    const portal = createNode({ type: 'view', id: 'p', z: 'a5', center: { x: 0, y: 0 }, size, scene: 'g' });
    const rootView = views[root];
    const withPortal = { ...views, g: inner, [root]: { ...rootView, nodes: { ...rootView.nodes, p: portal } } };
    writer.write(withPortal, views);
    expect(layoutKeys(canvas)).toContain('g');
    const model = canvas.model?.target;
    expect(Obj.instanceOf(Scene.Model2D, model) && model.objects['view:g']).toBeTruthy();
    expect(layout.model?.target).toBe(model);

    writer.write({ [root]: rootView }, withPortal);
    expect(layoutKeys(canvas)).not.toContain('g');
    expect(Obj.instanceOf(Scene.Model2D, model) && model.objects['view:g']).toBeUndefined();
  });
});
