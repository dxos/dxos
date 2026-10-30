//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Animation from '@dxos/plugin-animator/Animation';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { DEFAULT_LATTICE } from '@dxos/react-ui-canvas';
import { type View, type ViewMap, createNode } from '@dxos/react-ui-canvas/headless';
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
import { toCanvasView } from '@dxos/react-ui-scene/canvas';
import { type Node, Scene, type StyleClass, fromEcho } from '@dxos/scene';
import { CreatedFrom } from '@dxos/types';

import { Canvas } from '#types';

import types from '../capabilities/schema.ts';
import { CanvasBuilder } from './builder.ts';
import { addScene, openScene } from './canvas-document.ts';
import {
  clone,
  createCanvas,
  migrateContent,
  migrateLayers,
  pruneOrphanedViews,
  readViews,
  rootOf,
  updateCanvasRecord,
  writeStyles,
  writeViews,
} from './content.ts';
import { makeLayoutWriter } from './layout-writer.ts';
import { legacyDocument, migrateSceneDrawing, reconcileMigrations } from './migrate-scenes.ts';

/** A legacy canvas's Views as its records read once their content migrations ran. */
const legacyViews = (canvas: Drawing.Canvas) => {
  const content = clone(canvas.content);
  migrateContent(content);
  migrateLayers(content);
  pruneOrphanedViews(content);
  return { views: readViews(content), root: rootOf(content) };
};

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
      const { views: before, root: legacyRoot } = legacyViews(legacyCanvas);

      expect(await migrate(drawing)).toBe(true);
      const scene = openScene(migratedCanvas(drawing));
      if (!Obj.instanceOf(Scene.Scene2D, scene)) {
        throw new Error(`${name}: the migrated canvas opens a 2D scene.`);
      }
      const { root, views: after } = sceneViews(scene);
      expect(root, name).toBe(legacyRoot);
      expect(Object.keys(after).sort(), name).toEqual(Object.keys(before).sort());
      expect(after, name).toEqual(Object.fromEntries(Object.keys(after).map((id) => [id, before[id]])));
    }
  });

  test('a canvas timeline migrates into a shot over the migrated scene with element paths', async () => {
    const tree = createSquareTree();
    const drawing = legacyDrawing(tree.views, tree.root);
    const legacyCanvas = drawing.canvas.target;
    if (!Drawing.isCanvas(legacyCanvas)) {
      throw new Error('A legacy drawing has a base canvas.');
    }
    const [node] = Object.keys(tree.views[0].nodes);
    const timeline = {
      duration: 4,
      tracks: {
        [`${node}:style.opacity`]: {
          target: node,
          property: 'style.opacity',
          keys: [
            { t: 0, value: 0 },
            { t: 2, value: 1, easing: 'ease-out' },
          ],
        },
        [`${node}:center`]: { target: node, property: 'center', keys: [{ t: 1, value: { x: 10, y: 20 } }] },
        'camera:zoom': { target: 'camera', property: 'zoom', keys: [{ t: 0, value: 2 }] },
      },
    };
    Obj.update(legacyCanvas, (legacyCanvas) => {
      Reflect.set(legacyCanvas.content[`scene:${tree.root}`], 'timeline', timeline);
    });
    expect(await migrate(drawing)).toBe(true);
    const animations = await db.query(Filter.type(Animation.Animation)).run();
    expect(animations).toHaveLength(1);
    const [shot] = animations[0].shots;
    expect(shot.stage.target).toBe(openScene(migratedCanvas(drawing)));
    expect(shot.duration).toBe(4);
    expect(Object.keys(shot.timeline.tracks).sort()).toEqual(
      [`${node}:overrides.opacity`, `${node}:center`, 'camera:zoom'].sort(),
    );
    expect(shot.timeline.tracks[`${node}:overrides.opacity`]).toEqual({
      ...timeline.tracks[`${node}:style.opacity`],
      property: 'overrides.opacity',
    });
    expect(shot.timeline.tracks['camera:zoom']).toEqual(timeline.tracks['camera:zoom']);
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
    const opened = sceneViews(scene);
    const node: unknown = opened.views[opened.root].nodes.portal;
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
    expect(elements.a.dsl).toEqual({ object: 'server', element: 'server' });
    expect(elements.ab.dsl).toEqual({ object: 'calls', element: 'calls' });
    expect(elements.b.dsl).toBeUndefined();
  });

  test('named style classes become the model styles, settings move onto the Canvas and the lattice onto its layouts', async () => {
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
    expect(canvas.settings).toEqual({ theme: 'paper', grid: 24 });
    for (const ref of canvas.layouts) {
      expect(Obj.instanceOf(Scene.Layout2D, ref.target) && ref.target.lattice).toEqual(DEFAULT_LATTICE);
    }
    const model = canvas.model?.target;
    expect(Obj.instanceOf(Scene.Model2D, model) && model.styles).toEqual({
      warning: { name: warning.name, ...warning.style },
    });
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

    test('a View only the losing peer made is adopted by the winner, with the object that places it', async () => {
      const { drawing, winner, loser } = await migratedTwice();
      const scene = openScene(loser);
      if (!Obj.instanceOf(Scene.Scene2D, scene)) {
        throw new Error('A migrated canvas opens a 2D scene.');
      }
      const { root, views } = sceneViews(scene);
      const size = { width: 128, height: 128 };
      const rootView = views[root];
      makeLayoutWriter(scene, { canvas: loser }).write(
        {
          ...views,
          'peer-view': {
            id: 'peer-view',
            nodes: { x: createNode({ type: 'rect', id: 'x', z: 'a0', center: { x: 0, y: 0 }, size }) },
            links: {},
          },
          [root]: {
            ...rootView,
            nodes: {
              ...rootView.nodes,
              p: createNode({ type: 'view', id: 'p', z: 'a9', center: { x: 0, y: 0 }, size, scene: 'peer-view' }),
            },
          },
        },
        views,
      );
      expect(await reconcile(drawing)).toBe(true);
      const layout = winner.layouts
        .map((ref) => ref.target)
        .find((target) => Obj.instanceOf(Scene.Layout2D, target) && target.key === 'peer-view');
      expect(layout).toBeDefined();
      expect(rootLayout(winner).elements.p).toMatchObject({ object: 'view:peer-view' });
      const model = winner.model?.target;
      expect(Obj.instanceOf(Scene.Model2D, model) && model.objects['view:peer-view']?.parts?.target).toBe(layout);
      expect(await db.query(Filter.type(Canvas.Canvas)).run()).toEqual([winner]);
    });

    test("what the loser adopts names the winner's layouts, never the loser's, which are removed", async () => {
      const { drawing, winner, loser } = await migratedTwice();
      const scene = openScene(loser);
      if (!Obj.instanceOf(Scene.Scene2D, scene)) {
        throw new Error('A migrated canvas opens a 2D scene.');
      }
      // The loser adds a second scene over its root layout, and a portal to that root View (whose layout both have).
      const extra = addScene(loser, scene, { center: { x: 0, y: 0 }, zoom: 2 });
      const { root, views } = sceneViews(scene);
      const rootView = views[root];
      const size = { width: 128, height: 128 };
      makeLayoutWriter(scene, { canvas: loser }).write(
        {
          ...views,
          [root]: {
            ...rootView,
            nodes: {
              ...rootView.nodes,
              p: createNode({ type: 'view', id: 'p', z: 'a9', center: { x: 0, y: 0 }, size, scene: root }),
            },
          },
        },
        views,
      );
      expect(await reconcile(drawing)).toBe(true);
      const winnerRoot = rootLayout(winner);
      const adopted = winner.scenes.map((ref) => ref.target).find((target) => target === extra);
      expect(Obj.instanceOf(Scene.Scene2D, adopted) && adopted.layout.target).toBe(winnerRoot);
      const model = winnerRoot.model?.target;
      const object = Obj.instanceOf(Scene.Model2D, model) ? model.objects[`view:${root}`] : undefined;
      expect(object?.parts?.target).toBe(winnerRoot);
    });

    test("reconcile keeps the winner's root layout on its own model when the canvas lists none", async () => {
      const { drawing, winner, loser } = await migratedTwice();
      const own = db.add(Obj.make(Scene.Model2D, { key: 'own', objects: {} }));
      Obj.update(rootLayout(winner), (layout) => {
        layout.model = Ref.make(own);
      });
      Obj.update(winner, (winner) => {
        winner.model = undefined;
      });
      Obj.update(rootLayout(loser), (layout) => {
        layout.elements['added'] = { id: 'added', type: 'rect', center: { x: 0, y: 0 } };
      });
      const loserModel = db.add(
        Obj.make(Scene.Model2D, { key: 'peer', objects: { thing: { id: 'thing', type: 'rect' } } }),
      );
      Obj.update(loser, (loser) => {
        loser.model = Ref.make(loserModel);
      });
      expect(await reconcile(drawing)).toBe(true);
      expect(rootLayout(winner).model?.target).toBe(own);
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
