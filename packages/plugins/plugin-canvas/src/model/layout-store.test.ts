//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type View, readPath, reduceIntent, storeVersions } from '@dxos/react-ui-canvas/headless';
import { Scene, toEcho } from '@dxos/scene';

import { bindLayoutStore } from './layout-store.ts';

/** A 2D exemplar in ECHO form, its root narrowed to the Scene2D it is. */
const stored = (name: keyof typeof EXEMPLARS) => {
  const document = toEcho(Dsl.readScenes(EXEMPLARS[name]).document);
  const root = document.root;
  if (!Obj.instanceOf(Scene.Scene2D, root)) {
    throw new Error(`${name} is not a 2D exemplar.`);
  }
  return { ...document, root };
};

const moveNode = (view: View, id: string, center: { x: number; y: number }): View =>
  reduceIntent(view, { kind: 'update', id, values: { center } });

describe('bindLayoutStore', () => {
  test('a node moved through the store is written to the Layout2D element', () => {
    const { root, layouts } = stored('links');
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const views = registry.get(bound.store.views);
    registry.set(bound.store.views, { ...views, [bound.root]: moveNode(views[bound.root], 'a', { x: 64, y: 64 }) });
    const layout = layouts.get(bound.root);
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.a.center).toEqual({ x: 64, y: 64 });
    bound.dispose();
  });

  test('an ECHO edit to the Layout2D reaches the View atom', () => {
    const { root, layouts } = stored('links');
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const layout = layouts.get(bound.root);
    Obj.instanceOf(Scene.Layout2D, layout) &&
      Obj.update(layout, (layout) => {
        layout.elements.a.label = 'Alpha';
      });
    expect(registry.get(bound.store.view(bound.root))?.nodes.a).toMatchObject({ label: 'Alpha' });
    bound.dispose();
  });

  test("a composite's parts layout opens as its own View, and edits there write that layout", () => {
    const { root, layouts } = stored('subscene');
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const views = registry.get(bound.store.views);
    expect(views[bound.root].nodes.b).toMatchObject({ type: 'view', scene: 'b-detail' });
    registry.set(bound.store.views, { ...views, 'b-detail': moveNode(views['b-detail'], 'x', { x: 128, y: 0 }) });
    const detail = layouts.get('b-detail');
    expect(Obj.instanceOf(Scene.Layout2D, detail) && detail.elements.x.center).toEqual({ x: 128, y: 0 });
    const main = layouts.get(bound.root);
    expect(Obj.instanceOf(Scene.Layout2D, main) && main.elements.x).toBeUndefined();
    bound.dispose();
  });

  test('a camera change is written to the Scene2D, not the layout', () => {
    vi.useFakeTimers();
    try {
      const { root } = stored('links');
      const registry = Registry.make();
      const bound = bindLayoutStore(registry, root);
      expect(registry.get(bound.camera)).toEqual(root.camera);
      registry.set(bound.camera, { center: { x: 10, y: 20 }, zoom: 2 });
      expect(root.camera.zoom).toBe(1);
      vi.advanceTimersByTime(500);
      expect(root.camera).toEqual({ center: { x: 10, y: 20 }, zoom: 2 });
      bound.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  test('two scenes over one layout both see an edit made through either', () => {
    const { root, layouts } = stored('links');
    const layout = layouts.get('links');
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('links has a 2D layout');
    }
    const other = Obj.make(Scene.Scene2D, {
      key: 'zoomed',
      layout: Ref.make(layout),
      camera: { center: { x: 0, y: 0 }, zoom: 2 },
    });
    const registry = Registry.make();
    const first = bindLayoutStore(registry, root);
    const second = bindLayoutStore(registry, other);
    const views = registry.get(first.store.views);
    registry.set(first.store.views, { ...views, [first.root]: moveNode(views[first.root], 'c', { x: 640, y: 64 }) });
    expect(registry.get(second.store.view(second.root))?.nodes.c?.center).toEqual({ x: 640, y: 64 });
    first.dispose();
    second.dispose();
  });
});

describe('bindLayoutStore writes', () => {
  test('an unchanged element is not rewritten when another moves', () => {
    const { root, layouts } = stored('links');
    const layout = layouts.get('links');
    const before = Obj.instanceOf(Scene.Layout2D, layout) ? JSON.stringify(layout.elements.b) : '';
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const views = registry.get(bound.store.views);
    registry.set(bound.store.views, { ...views, [bound.root]: moveNode(views[bound.root], 'a', { x: 64, y: 64 }) });
    expect(Obj.instanceOf(Scene.Layout2D, layout) && JSON.stringify(layout.elements.b)).toBe(before);
    bound.dispose();
  });

  test('a moved element that places a model object keeps placing it', () => {
    const { root, layouts } = stored('links');
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const views = registry.get(bound.store.views);
    registry.set(bound.store.views, { ...views, [bound.root]: moveNode(views[bound.root], 'b', { x: 320, y: 64 }) });
    const layout = layouts.get('links');
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.b).toMatchObject({
      object: 'box',
      center: { x: 320, y: 64 },
      style: { hue: 'green' },
    });
    // The size and the rest of the style are still the object's.
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.b.size).toBeUndefined();
    expect(Obj.instanceOf(Scene.Layout2D, layout) && layout.elements.b.style).toEqual({ hue: 'green' });
    bound.dispose();
  });
});

describe('bindLayoutStore versions', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('versions.read at earlier heads returns the earlier View', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Scene.Scene2D, Scene.Layout2D, Scene.Model2D]);
    const { root, layouts, models } = stored('links');
    [...layouts.values(), ...models.values()].forEach((object) => db.add(object));
    db.add(root);
    await db.flush();

    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const versions = storeVersions(registry, bound.store);
    const before = versions.heads();
    const views = registry.get(bound.store.views);
    registry.set(bound.store.views, { ...views, [bound.root]: moveNode(views[bound.root], 'a', { x: 64, y: 64 }) });
    await db.flush();

    const path = [bound.root, 'nodes', 'a', 'center'];
    expect(versions.read(path)).toEqual({ x: 64, y: 64 });
    expect(versions.read(path, before)).toEqual(readPath(views, path));
    bound.dispose();
  });
});
