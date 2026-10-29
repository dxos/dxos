//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { type Node, type StyleClass, type View } from '@dxos/react-ui-canvas/headless';
import {
  createLatticeTree,
  createLinkedPairTree,
  createModelViewTree,
  createNestedDeepTree,
  createNestedSimpleTree,
  createNestedViewTree,
  createObjectsTree,
  createSquareTree,
  createViewTree,
} from '@dxos/react-ui-canvas/testing';
import { Scene } from '@dxos/scene';

import { Canvas } from '#types';

import types from '../capabilities/schema.ts';
import { CanvasBuilder } from './builder.ts';
import { openScene } from './canvas-document.ts';
import { updateCanvasRecord, writeStyles, writeViews } from './content.ts';
import { bindLayoutStore } from './layout-store.ts';
import { migrateSceneDrawing } from './migrate-scenes.ts';
import { bindCanvasStore, createCanvas } from './store.ts';

const SAMPLES = {
  square: createSquareTree,
  lattice: createLatticeTree,
  nestedDeep: createNestedDeepTree,
  linkedPair: createLinkedPairTree,
  nestedSimple: createNestedSimpleTree,
  nestedView: createNestedViewTree,
  objects: createObjectsTree,
  model: () => createModelViewTree(),
  tree: () => createViewTree(2),
};

const LEGACY_VARIANT: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  builder: CanvasBuilder,
};

describe('migrateSceneDrawing', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, ...types] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const migrate = (drawing: Drawing.Drawing) =>
    EffectEx.runPromise(migrateSceneDrawing(drawing).pipe(Effect.provide(Database.layer(db))));

  /** A scene drawing stored the v2 way, holding `views` with `root` first. */
  const legacyDrawing = (views: readonly View[], root: string, settings = {}) => {
    const canvas = db.add(createCanvas(settings));
    Obj.update(canvas, (canvas) => {
      // The sample's root takes the place of the seeded one.
      Reflect.set(canvas.content, 'canvas', { kind: 'canvas', root, ...settings });
      delete canvas.content['scene:root'];
      writeViews(canvas.content, Object.fromEntries(views.map((view) => [view.id, view])));
    });
    return db.add(Drawing.make({ name: 'Legacy', canvas }));
  };

  const migratedCanvas = (drawing: Drawing.Drawing): Canvas.Canvas => {
    const canvas = drawing.canvas.target;
    if (!Canvas.isCanvas(canvas)) {
      throw new Error('The drawing was not migrated.');
    }
    return canvas;
  };

  test('every sample canvas reads the same Views before and after migration', async () => {
    for (const [name, sample] of Object.entries(SAMPLES)) {
      const tree = sample();
      const drawing = legacyDrawing(tree.views, tree.root);
      await db.flush();
      const legacyCanvas = drawing.canvas.target;
      if (!Drawing.isCanvas(legacyCanvas)) {
        throw new Error('A legacy drawing has a base canvas.');
      }
      const registry = Registry.make();
      const legacy = bindCanvasStore(registry, legacyCanvas);
      const before = registry.get(legacy.store.views);
      const legacyRoot = legacy.root;
      legacy.dispose();

      expect(await migrate(drawing)).toBe(true);
      const scene = openScene(migratedCanvas(drawing));
      if (!Obj.instanceOf(Scene.Scene2D, scene)) {
        throw new Error(`${name}: the migrated canvas opens a 2D scene.`);
      }
      const bound = bindLayoutStore(registry, scene);
      const after = registry.get(bound.store.views);
      bound.dispose();
      expect(bound.root, name).toBe(legacyRoot);
      expect(after, name).toEqual(Object.fromEntries(Object.keys(after).map((id) => [id, before[id]])));
    }
  });

  test('running it twice changes nothing the second time', async () => {
    const tree = createSquareTree();
    const drawing = legacyDrawing(tree.views, tree.root);
    expect(await migrate(drawing)).toBe(true);
    const canvas = drawing.canvas.target;
    expect(await migrate(drawing)).toBe(false);
    expect(drawing.canvas.target).toBe(canvas);
  });

  test('a tldraw drawing is left as it is', async () => {
    const canvas = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA }));
    const drawing = db.add(Drawing.make({ name: 'tldraw', canvas }));
    expect(await migrate(drawing)).toBe(false);
    expect(drawing.canvas.target).toBe(canvas);
  });

  test('a portal to another drawing keeps its link', async () => {
    const other = db.add(Drawing.make({ name: 'Other', canvas: db.add(createCanvas()) }));
    const tree = createNestedSimpleTree();
    const root = tree.views.find((view) => view.id === tree.root);
    const portal = root && Object.values(root.nodes).find((node) => node.type === 'view');
    if (!root || !portal) {
      throw new Error('The nested sample has a portal at its root.');
    }
    // A frame's link is a field of the view node type, which `Node` (the shared fields) does not list.
    const withLink: Node & Record<string, unknown> = { ...portal, link: { object: Ref.make(other) } };
    const linked: View = { ...root, nodes: { ...root.nodes, [portal.id]: withLink } };
    const drawing = legacyDrawing([linked, ...tree.views.filter((view) => view !== root)], tree.root);
    await db.flush();
    expect(await migrate(drawing)).toBe(true);
    const scene = openScene(migratedCanvas(drawing));
    const layout = scene?.layout.target;
    const element = Obj.instanceOf(Scene.Layout2D, layout) ? layout.elements[portal.id] : undefined;
    const link: unknown = element?.props?.canvas?.link?.object;
    expect(Ref.isRef(link) ? link.uri.toString() : JSON.stringify(link)).toContain(other.id);
  });

  test('named style classes and settings move onto the Canvas', async () => {
    const tree = createSquareTree();
    const warning: StyleClass = { id: 'warning', name: 'Warning', style: { hue: 'red' } };
    const drawing = legacyDrawing(tree.views, tree.root, { theme: 'paper', lattice: true });
    const legacyCanvas = drawing.canvas.target;
    if (!Drawing.isCanvas(legacyCanvas)) {
      throw new Error('A legacy drawing has a base canvas.');
    }
    Obj.update(legacyCanvas, (legacyCanvas) => {
      legacyCanvas.styles = {};
      writeStyles(legacyCanvas.styles, { warning });
      updateCanvasRecord(legacyCanvas.content, { grid: 24 });
    });
    expect(await migrate(drawing)).toBe(true);
    const canvas = migratedCanvas(drawing);
    expect(canvas.settings).toEqual({ theme: 'paper', lattice: true, grid: 24 });
    expect(canvas.styles).toEqual({ warning });
  });

  test('an old client sees the migrated canvas as a type it cannot open', async () => {
    const tree = createSquareTree();
    const drawing = legacyDrawing(tree.views, tree.root);
    expect(await migrate(drawing)).toBe(true);
    expect(IllustratorCapabilities.variantFor(drawing.canvas.target, [LEGACY_VARIANT])).toBeUndefined();
  });
});
