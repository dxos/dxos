//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Diagnostics, Dsl, Objective, Score } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import {
  DEFAULT_LATTICE,
  cellBounds,
  createLatticeProjection,
  defaultNodeRegistry,
  nodeBounds,
  toDiagramObjects,
} from '@dxos/react-ui-canvas';
import {
  type View,
  createMemoryStore,
  createNode,
  readPath,
  reduceIntent,
  storeVersions,
} from '@dxos/react-ui-canvas/headless';
import {
  createLatticeTree,
  createModelViewTree,
  createNestedViewTree,
  createSquareTree,
} from '@dxos/react-ui-canvas/testing';
import { Scene, toEcho } from '@dxos/scene';

import { Canvas } from '#types';

import { makeCanvas } from './canvas-document.ts';
import { writeViews } from './content.ts';
import { bindLayoutStore, liveLayoutStore } from './layout-store.ts';
import { legacyDocument } from './migrate-scenes.ts';
import { isConstrainedModel, layoutModelAtom } from './projection-model.ts';

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

  test("a camera change stays the viewer's: the Scene2D's authored camera is never written", () => {
    vi.useFakeTimers();
    try {
      const { root } = stored('links');
      const authored = { ...root.camera, center: { ...root.camera.center } };
      const registry = Registry.make();
      const bound = bindLayoutStore(registry, root);
      expect(registry.get(bound.camera)).toEqual(root.camera);
      registry.set(bound.camera, { center: { x: 10, y: 20 }, zoom: 2 });
      vi.advanceTimersByTime(5_000);
      expect(root.camera).toEqual(authored);
      expect(registry.get(bound.camera)).toEqual({ center: { x: 10, y: 20 }, zoom: 2 });
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

describe('bindLayoutStore keeps what it does not own', () => {
  test('a .dx layout read again after one move shows every element', () => {
    const { root } = stored('links');
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const views = registry.get(bound.store.views);
    registry.set(bound.store.views, { ...views, [bound.root]: moveNode(views[bound.root], 'a', { x: 64, y: 64 }) });
    bound.dispose();
    const again = Registry.make();
    const reopened = bindLayoutStore(again, root);
    const view = again.get(reopened.store.views)[reopened.root];
    reopened.dispose();
    expect(Object.keys(view.nodes).sort()).toEqual(['a', 'b', 'c']);
    expect(Object.keys(view.links).sort()).toEqual(['ab', 'bc']);
  });

  test("renaming a View keeps the constrained model kept in its layout's props", () => {
    const { root, layouts } = stored('links');
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const layout = layouts.get(bound.root);
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('links is a 2D exemplar.');
    }
    const model = { nodes: [{ id: 'a' }], constraints: [] };
    const constrained = layoutModelAtom(registry, layout, ['constrained'], isConstrainedModel, {
      nodes: [],
      constraints: [],
    });
    registry.set(constrained.atom, model);
    const views = registry.get(bound.store.views);
    registry.set(bound.store.views, { ...views, [bound.root]: { ...views[bound.root], name: 'Renamed' } });
    expect(layout.name).toBe('Renamed');
    expect(layout.props?.constrained).toEqual(model);
    constrained.dispose();
    bound.dispose();
  });
});

describe('bindLayoutStore lists what it makes on the Canvas', () => {
  const layoutKeys = (canvas: Canvas.Canvas) =>
    canvas.layouts.flatMap((ref) => (Obj.instanceOf(Scene.Layout2D, ref.target) ? [ref.target.key] : []));

  test('a portal and its View a write makes are listed on the canvas, and removed with the portal', () => {
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
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, scene, { canvas });
    const views = registry.get(bound.store.views);
    const size = { width: 128, height: 128 };
    const inner: View = {
      id: 'g',
      nodes: { x: createNode({ type: 'rect', id: 'x', z: 'a0', center: { x: 0, y: 0 }, size }) },
      links: {},
    };
    const portal = createNode({ type: 'view', id: 'p', z: 'a5', center: { x: 0, y: 0 }, size, scene: 'g' });
    const rootView = views[bound.root];
    registry.set(bound.store.views, {
      ...views,
      g: inner,
      [bound.root]: { ...rootView, nodes: { ...rootView.nodes, p: portal } },
    });
    expect(layoutKeys(canvas)).toContain('g');
    const model = canvas.model?.target;
    expect(Obj.instanceOf(Scene.Model2D, model) && model.objects['view:g']).toBeTruthy();
    expect(layout.model?.target).toBe(model);

    registry.set(bound.store.views, { [bound.root]: rootView });
    expect(layoutKeys(canvas)).not.toContain('g');
    expect(Obj.instanceOf(Scene.Model2D, model) && model.objects['view:g']).toBeUndefined();
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

  test('a layout and a model of one key keep their own heads', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Scene.Scene2D, Scene.Layout2D, Scene.Model2D]);
    const model = db.add(Obj.make(Scene.Model2D, { key: 'shared', objects: {} }));
    const size = { width: 64, height: 64 };
    const layout = db.add(
      Obj.make(Scene.Layout2D, {
        key: 'shared',
        model: Ref.make(model),
        elements: { a: { id: 'a', kind: 'rect', center: { x: 0, y: 0 }, size } },
      }),
    );
    const root = db.add(
      Obj.make(Scene.Scene2D, { key: 'scene', layout: Ref.make(layout), camera: { center: { x: 0, y: 0 }, zoom: 1 } }),
    );
    await db.flush();
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, root);
    const heads: unknown = bound.store.versions?.heads();
    expect(isRecord(heads) && Object.keys(heads)).toHaveLength(2);
    bound.dispose();
  });
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

describe('lattice mode on Layout2D', () => {
  /** The lattice sample migrated into layouts, bound as the article binds a lattice canvas. */
  const latticeStore = () => {
    const tree = createLatticeTree();
    const content: Record<string, unknown> = {};
    const views = Object.fromEntries(tree.views.map((view) => [view.id, view]));
    content.canvas = { kind: 'canvas', root: tree.root, lattice: true };
    writeViews(content, views);
    const stored = toEcho(legacyDocument(content));
    const scene = stored.root;
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('The lattice sample opens a 2D scene.');
    }
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, scene);
    const projection = createLatticeProjection({ registry, store: bound.store, sceneId: bound.root });
    const layout = stored.layouts.get(bound.root);
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('The lattice sample has a 2D root layout.');
    }
    return { registry, bound, projection, layout };
  };

  test('a move lands on whole cells and is written to the Layout2D element', () => {
    const { registry, bound, projection, layout } = latticeStore();
    // Most of a pitch down and a little right: the shape lands one row down, on the cell grid.
    projection.apply({ kind: 'move', ids: ['e'], delta: { x: 20, y: 170 } });
    const node = registry.get(bound.store.view(bound.root))?.nodes.e;
    expect(node && nodeBounds(node)).toEqual(cellBounds({ col: 0, row: 2, spanX: 1, spanY: 1 }, DEFAULT_LATTICE));
    expect(layout.elements.e.center).toEqual(node?.center);
    bound.dispose();
  });

  test('a resize spans whole cells and is written to the Layout2D element', () => {
    const { registry, bound, projection, layout } = latticeStore();
    // E is one cell at (0, 1); the cell to its right is free, so it widens across both.
    const wide = cellBounds({ col: 0, row: 1, spanX: 2, spanY: 1 }, DEFAULT_LATTICE);
    projection.apply({ kind: 'resize', id: 'e', bounds: { ...wide, width: wide.width - 40 } });
    const node = registry.get(bound.store.view(bound.root))?.nodes.e;
    expect(node && nodeBounds(node)).toEqual(wide);
    expect(layout.elements.e.size).toEqual({ width: wide.width, height: wide.height });
    bound.dispose();
  });

  test('a move onto an occupied cell is refused and leaves the layout as it was', () => {
    const { bound, projection, layout } = latticeStore();
    const before = JSON.stringify(layout.elements);
    // D sits one row above E: moving E up onto it is refused.
    projection.apply({ kind: 'move', ids: ['e'], delta: { x: 0, y: -192 } });
    expect(JSON.stringify(layout.elements)).toBe(before);
    bound.dispose();
  });
});

describe('scored mode on Layout2D', () => {
  /** The scores the Scored story shows for a View: the default objective's scorers over its diagram objects. */
  const scoresOf = (view: View) => {
    const { objects } = toDiagramObjects(view, defaultNodeRegistry);
    return EffectEx.runPromise(
      Score.evaluate(Score.fromObjective(Objective.DEFAULT), { objects, report: Diagnostics.analyze(objects) }),
    );
  };

  test('scoring the View a Layout2D store emits equals scoring the same View held in memory', async () => {
    for (const tree of [createSquareTree(), createNestedViewTree(), createModelViewTree()]) {
      const content: Record<string, unknown> = { canvas: { kind: 'canvas', root: tree.root } };
      writeViews(content, Object.fromEntries(tree.views.map((view) => [view.id, view])));
      const scene = toEcho(legacyDocument(content)).root;
      if (!Obj.instanceOf(Scene.Scene2D, scene)) {
        throw new Error('A canvas sample opens a 2D scene.');
      }
      const registry = Registry.make();
      const bound = bindLayoutStore(registry, scene);
      const stored = registry.get(bound.store.view(bound.root));
      const memory = createMemoryStore(tree.views, {}, { root: tree.root });
      const held = registry.get(memory.view(tree.root));
      if (!stored || !held) {
        throw new Error('Both stores show the root View.');
      }
      expect(await scoresOf(stored)).toEqual(await scoresOf(held));
      bound.dispose();
    }
  });
});

describe('bindLayoutStore over a Canvas', () => {
  test("the store's style classes are the canvas's, both ways", () => {
    const { canvas, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('A 2D canvas opens a 2D scene.');
    }
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, scene, { canvas });
    const styles = bound.store.styles;
    if (!styles) {
      throw new Error('A canvas store has style classes.');
    }
    const warning = { id: 'warning', name: 'Warning', style: { hue: 'red' as const } };
    registry.set(styles, { warning });
    expect(canvas.styles).toEqual({ warning });
    Obj.update(canvas, (canvas) => {
      canvas.styles = { warning: { ...warning, name: 'Caution' } };
    });
    expect(registry.get(styles).warning?.name).toBe('Caution');
    bound.dispose();
  });

  test('an open store is found by its canvas, until it is disposed', () => {
    const { canvas, scene } = makeCanvas();
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('A 2D canvas opens a 2D scene.');
    }
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, scene, { canvas });
    expect(liveLayoutStore(canvas.id)?.bound).toBe(bound);
    bound.dispose();
    expect(liveLayoutStore(canvas.id)).toBeUndefined();
  });
});
