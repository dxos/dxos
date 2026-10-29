//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { type Node, type StyleClass, type View, createNode } from '@dxos/react-ui-canvas/headless';
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
import { CreatedFrom } from '@dxos/types';

import { Canvas } from '#types';

import types from '../capabilities/schema.ts';
import { CanvasBuilder } from './builder.ts';
import { openScene } from './canvas-document.ts';
import { updateCanvasRecord, writeStyles, writeViews } from './content.ts';
import { bindLayoutStore } from './layout-store.ts';
import { legacyDocument, migrateSceneDrawing, reconcileMigrations } from './migrate-scenes.ts';
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
      expect(Object.keys(after).sort(), name).toEqual(Object.keys(before).sort());
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

  test('a portal to another drawing stays a portal, with its scene and link', async () => {
    const other = db.add(Drawing.make({ name: 'Other', canvas: db.add(createCanvas()) }));
    const tree = createSquareTree();
    const root = tree.views.find((view) => view.id === tree.root);
    if (!root) {
      throw new Error('The square sample has a root View.');
    }
    // A frame's link and scene are fields of the view node type, which `Node` (the shared fields) does not list; the
    // scene names a View of the other drawing, not one of this one.
    const portal: Node & Record<string, unknown> = {
      ...createNode({
        type: 'view',
        id: 'portal',
        z: 'z9',
        center: { x: 512, y: 0 },
        size: { width: 256, height: 128 },
        scene: 'other-drawing-view',
      }),
      link: { object: Ref.make(other) },
    };
    const linked: View = { ...root, nodes: { ...root.nodes, portal } };
    const drawing = legacyDrawing([linked, ...tree.views.filter((view) => view !== root)], tree.root);
    await db.flush();
    expect(await migrate(drawing)).toBe(true);
    const scene = openScene(migratedCanvas(drawing));
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      throw new Error('The migrated canvas opens a 2D scene.');
    }
    const registry = Registry.make();
    const bound = bindLayoutStore(registry, scene);
    const node: unknown = registry.get(bound.store.views)[bound.root].nodes.portal;
    bound.dispose();
    expect(node).toMatchObject({ type: 'view', scene: 'other-drawing-view' });
    const link: unknown = isRecord(node) && isRecord(node.link) ? node.link.object : undefined;
    expect(Ref.isRef(link) ? link.uri.toString() : JSON.stringify(link)).toContain(other.id);
  });

  test("each node's and link's DSL identity is carried onto its element", () => {
    const node = { type: 'rect', id: 'a', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
    const peer = { ...node, id: 'b', z: 'a1', center: { x: 128, y: 0 } };
    const link = { type: 'line', id: 'ab', z: 'a2', source: { node: 'a' }, target: { node: 'b' } };
    const doc = legacyDocument({
      'canvas': { kind: 'canvas', root: 'root' },
      'scene:root': { kind: 'scene', id: 'root' },
      'node:a': { kind: 'node', scene: 'root', node, dsl: { object: 'server', element: 'server' } },
      'node:b': { kind: 'node', scene: 'root', node: peer },
      'link:ab': { kind: 'link', scene: 'root', link, dsl: { object: 'calls', element: 'calls' } },
    });
    const elements = doc.layouts[0].elements;
    expect(elements.a.props?.dsl).toEqual({ object: 'server', element: 'server' });
    expect(elements.ab.props?.dsl).toEqual({ object: 'calls', element: 'calls' });
    expect(elements.b.props?.dsl).toBeUndefined();
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
    // A client from before `Canvas` finds a variant by the base canvas's schema, which a `Canvas` has none of: it
    // shows the drawing as unsupported and has nothing to write it with.
    const target: unknown = drawing.canvas.target;
    const schema = isRecord(target) && typeof target.schema === 'string' ? target.schema : '';
    expect([LEGACY_VARIANT].find((entry) => Drawing.isSameFormat(entry.id, schema))).toBeUndefined();
  });

  describe('parallel migrations', () => {
    const reconcile = (drawing: Drawing.Drawing) =>
      EffectEx.runPromise(reconcileMigrations(drawing).pipe(Effect.provide(Database.layer(db))));

    const rootLayout = (canvas: Canvas.Canvas): Scene.Layout2D => {
      const layout = openScene(canvas)?.layout.target;
      if (!Obj.instanceOf(Scene.Layout2D, layout)) {
        throw new Error('A migrated canvas opens a 2D layout.');
      }
      return layout;
    };

    /** Two peers migrate one legacy drawing: the drawing keeps the first canvas, the second is a loser. */
    const migratedTwice = async () => {
      const tree = createSquareTree();
      const drawing = legacyDrawing(tree.views, tree.root);
      const legacy = drawing.canvas.target;
      if (!Drawing.isCanvas(legacy)) {
        throw new Error('A legacy drawing has a base canvas.');
      }
      expect(await migrate(drawing)).toBe(true);
      const winner = migratedCanvas(drawing);
      Obj.update(drawing, (drawing) => {
        drawing.canvas = Ref.make(legacy);
      });
      expect(await migrate(drawing)).toBe(true);
      const loser = migratedCanvas(drawing);
      Obj.update(drawing, (drawing) => {
        drawing.canvas = Ref.make(winner);
      });
      const [id] = Object.keys(rootLayout(winner).elements);
      return { drawing, legacy, winner, loser, id };
    };

    test('a migration records the legacy canvas the new one was created from', async () => {
      const { winner, legacy } = await migratedTwice();
      const relations = await db.query(Query.select(Filter.id(winner.id)).sourceOf(CreatedFrom.CreatedFrom)).run();
      expect(relations).toHaveLength(1);
      expect(Relation.getTarget(relations[0])).toBe(legacy);
      expect(relations[0].reason).toBe('migration');
    });

    test("the loser's edits are replayed into the winner, the loser is removed, and a second run does nothing", async () => {
      const { drawing, winner, loser, id } = await migratedTwice();
      Obj.update(rootLayout(loser), (layout) => {
        layout.elements[id].center = { x: 640, y: 320 };
      });
      expect(await reconcile(drawing)).toBe(true);
      expect(rootLayout(winner).elements[id].center).toEqual({ x: 640, y: 320 });
      expect(await db.query(Filter.type(Canvas.Canvas)).run()).toEqual([winner]);
      expect(await db.query(Filter.type(CreatedFrom.CreatedFrom)).run()).toHaveLength(1);
      expect(await reconcile(drawing)).toBe(false);
    });

    test("the winner's own edit wins where both changed a field; the loser's other changes are kept", async () => {
      const { drawing, winner, loser, id } = await migratedTwice();
      Obj.update(rootLayout(winner), (layout) => {
        layout.elements[id].center = { x: 64, y: 64 };
      });
      Obj.update(rootLayout(loser), (layout) => {
        layout.elements[id].center = { x: 640, y: 320 };
        layout.elements[id].label = 'From the other peer';
      });
      expect(await reconcile(drawing)).toBe(true);
      expect(rootLayout(winner).elements[id]).toMatchObject({ center: { x: 64, y: 64 }, label: 'From the other peer' });
    });
  });
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
