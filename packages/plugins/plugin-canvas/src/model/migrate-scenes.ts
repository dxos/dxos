//
// Copyright 2026 DXOS.org
//

//
// Moves a scene drawing (a `Drawing.Canvas` of `dxos.org/scene/2` records) onto this plugin's `Canvas`: each View
// becomes a Layout2D with a Scene2D over it, the objects its portals and instances place become one Model2D, and
// the settings and style classes move onto the Canvas. ECHO's migrations map one type to one type and cannot make
// objects, so this runs when a drawing is opened for writing, or across a space on request.
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type View } from '@dxos/react-ui-canvas/headless';
import { fromCanvasView } from '@dxos/react-ui-scene/canvas';
import { Scene, bounds2D, toEcho } from '@dxos/scene';
import { CreatedFrom } from '@dxos/types';

import { Canvas } from '#types';

import { canvasDocument, removeCanvas } from './canvas-document.ts';
import {
  canvasRecordOf,
  clone,
  isLinkRecord,
  isNodeRecord,
  migrateContent,
  migrateLayers,
  pruneOrphanedViews,
  readStyles,
  readViews,
  rootOf,
} from './content.ts';
import { plain } from './layout-writer.ts';

/** The one model a migrated canvas's portals and instances place their objects from. */
const MODEL_ID = 'model';

/** The object id an `instance` node of a composite places, which an unplaced composite takes as well. */
const COMPOSITE_PREFIX = 'instance:';

/** Each record's DSL identity as its element's `props.dsl`, which the illustrator's commands find elements by. */
const withIdentities = (layout: Scene.LayoutRecord2D, content: Drawing.Canvas['content']): Scene.LayoutRecord2D => {
  const identities = new Map(
    Object.values(content).flatMap((record) =>
      isNodeRecord(record) && record.dsl
        ? [[record.node.id, record.dsl] as const]
        : isLinkRecord(record) && record.dsl
          ? [[record.link.id, record.dsl] as const]
          : [],
    ),
  );
  return {
    ...layout,
    elements: Object.fromEntries(
      Object.entries(layout.elements).map(([id, element]) => {
        const dsl = identities.get(id);
        return [id, dsl ? { ...element, props: { ...element.props, dsl: clone(dsl) } } : element];
      }),
    ),
  };
};

/** A View's scene: its layout, seen from the middle of what it holds at zoom 1, since v2 stored no viewport. */
const sceneOf = (layout: Scene.LayoutRecord2D): Scene.SceneRecord2D => {
  const { x, y, width, height } = bounds2D(layout.elements);
  return {
    id: layout.id,
    dim: '2d',
    ...(layout.name === undefined ? {} : { name: layout.name }),
    layout: layout.id,
    camera: { center: { x: x + width / 2, y: y + height / 2 }, zoom: 1 },
  };
};

/**
 * A scene canvas's content as a scene document, read as the canvas store reads it (legacy root renamed, layers
 * placed, orphans pruned) without writing the canvas: the root View's scene first.
 */
export const legacyDocument = (content: Drawing.Canvas['content']): Scene.SceneDocument => {
  const copy = clone(content);
  migrateContent(copy);
  migrateLayers(copy);
  pruneOrphanedViews(copy);
  const root = rootOf(copy);
  const views: View[] = Object.values(readViews(copy)).sort(
    (left, right) => Number(right.id === root) - Number(left.id === root),
  );
  const objects: Record<string, Scene.Object2D> = {};
  const layouts = views.map((view) => {
    const { layout, objects: placed } = fromCanvasView(view);
    placed.forEach((object) => (objects[object.id] = object));
    return withIdentities(layout, copy);
  });
  // A composite no node places yet (a library definition) is reached through an object of its own, or a canvas
  // opened at its root would never read it.
  const placedParts = new Set(Object.values(objects).flatMap((object) => (object.parts ? [object.parts] : [])));
  for (const layout of layouts.slice(1)) {
    if (!placedParts.has(layout.id)) {
      const id = `${COMPOSITE_PREFIX}${layout.id}`;
      objects[id] = { id, kind: 'rect', parts: layout.id };
    }
  }
  const hasModel = Object.keys(objects).length > 0;
  const withModel = layouts.map((layout) => (hasModel ? { ...layout, model: MODEL_ID } : layout));
  return {
    scenes: withModel.map(sceneOf),
    layouts: withModel,
    models: hasModel ? [{ id: MODEL_ID, dim: '2d', objects }] : [],
  };
};

/**
 * Migrates `drawing` when its canvas is a current-revision scene canvas, repointing it at a new `Canvas` in one
 * change; any other drawing (tldraw, excalidraw, one already migrated, one a newer plugin wrote) is left as it is.
 * The legacy canvas is kept, unreferenced. Returns whether it changed anything.
 */
export const migrateSceneDrawing = Effect.fn(function* (drawing: Drawing.Drawing) {
  const legacy = yield* Database.load(drawing.canvas);
  if (!Drawing.isCanvas(legacy) || Canvas.sceneRevision(legacy.schema) !== Canvas.SCENE_REVISION) {
    return false;
  }
  const stored = toEcho(legacyDocument(legacy.content));
  for (const object of [...stored.models.values(), ...stored.layouts.values(), ...stored.scenes.values()]) {
    yield* Database.add(object);
  }
  const {
    kind: _kind,
    root: _root,
    ...settings
  } = clone(canvasRecordOf(legacy.content) ?? { kind: 'canvas', root: '' });
  const styles = readStyles(legacy.styles);
  const model = stored.models.get(MODEL_ID);
  const canvas = yield* Database.add(
    Obj.make(Canvas.Canvas, {
      settings,
      ...(Object.keys(styles).length > 0 ? { styles } : {}),
      ...(model ? { model: Ref.make(model) } : {}),
      layouts: [...stored.layouts.values()].map((layout) => Ref.make(layout)),
      scenes: [...stored.scenes.values()].map((scene) => Ref.make(scene)),
    }),
  );
  // Another peer may migrate the same drawing at the same time; the relation is how the copies find each other.
  yield* Database.add(
    CreatedFrom.make({
      [Relation.Source]: canvas,
      [Relation.Target]: legacy,
      reason: MIGRATION,
      createdAt: new Date().toISOString(),
    }),
  );
  Obj.update(drawing, (drawing) => {
    drawing.canvas = Ref.make(canvas);
  });
  return true;
});

const MIGRATION = 'migration';

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields => typeof value === 'object' && value !== null;

const fieldsOf = (value: unknown): Fields => (isRecord(value) ? value : {});

/**
 * Writes onto `target` each field `copy` changed from `base` that `target` still holds at `base`'s value: a change
 * only the other copy made is kept, and where both changed a field, the target's change stands.
 */
const replayFields = (target: object, base: unknown, copy: unknown): boolean => {
  const before = fieldsOf(base);
  const after = fieldsOf(copy);
  const current = fieldsOf(clone(target));
  let changed = false;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (same(after[key], before[key]) || !same(current[key], before[key])) {
      continue;
    }
    after[key] === undefined ? Reflect.deleteProperty(target, key) : Reflect.set(target, key, clone(after[key]));
    changed = true;
  }
  return changed;
};

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/** Replays what a losing copy changed in one layout onto the winner's layout of the same key. */
const replayLayout = (target: Scene.Layout2D, base: Scene.LayoutRecord2D, copy: Scene.LayoutRecord2D) =>
  Obj.update(target, (target) => {
    for (const [id, element] of Object.entries(copy.elements)) {
      const before = base.elements[id];
      const current = target.elements[id];
      if (!before) {
        // An element the other copy added, which the winner does not have.
        current === undefined && (target.elements[id] = plain(element));
      } else if (current !== undefined) {
        // An element the winner deleted stays deleted.
        replayFields(current, before, element);
      }
    }
    for (const [id, before] of Object.entries(base.elements)) {
      const current = target.elements[id];
      if (!(id in copy.elements) && current !== undefined && same(clone(current), before)) {
        delete target.elements[id];
      }
    }
    copy.name !== base.name && target.name === base.name && (target.name = copy.name);
  });

/**
 * When `drawing`'s canvas was migrated while another peer migrated the same legacy canvas, adopts the drawing's
 * canvas as the winner: each other canvas created from that legacy canvas has what it changed (relative to the legacy
 * content) replayed into the winner, then is removed with its scenes, layouts, model and relation. Returns whether it
 * found any; a second run finds none.
 */
export const reconcileMigrations = Effect.fn(function* (drawing: Drawing.Drawing) {
  const winner = yield* Database.load(drawing.canvas);
  if (!Canvas.isCanvas(winner)) {
    return false;
  }
  const [origin] = yield* Database.query(Query.select(Filter.id(winner.id)).sourceOf(CreatedFrom.CreatedFrom)).run;
  const legacy = origin && origin.reason === MIGRATION ? Relation.getTarget(origin) : undefined;
  if (!Drawing.isCanvas(legacy)) {
    return false;
  }
  const relations = yield* Database.query(Query.select(Filter.id(legacy.id)).targetOf(CreatedFrom.CreatedFrom)).run;
  const losers = relations.flatMap((relation) => {
    const source = Relation.getSource(relation);
    return relation.reason === MIGRATION && source !== winner && Canvas.isCanvas(source)
      ? [{ relation, canvas: source }]
      : [];
  });
  if (losers.length === 0) {
    return false;
  }
  const base = legacyDocument(legacy.content);
  const baseLayouts = new Map(base.layouts.flatMap((layout) => (layout.dim === '2d' ? [[layout.id, layout]] : [])));
  const baseScenes = new Map(base.scenes.map((scene) => [scene.id, scene]));
  const baseSettings = (() => {
    const {
      kind: _kind,
      root: _root,
      ...settings
    } = clone(canvasRecordOf(legacy.content) ?? { kind: 'canvas', root: '' });
    return settings;
  })();
  const winnerLayouts = new Map(
    winner.layouts.flatMap((ref) => (Obj.instanceOf(Scene.Layout2D, ref.target) ? [[ref.target.key, ref.target]] : [])),
  );
  const winnerScenes = new Map(
    winner.scenes.flatMap((ref) => (Obj.instanceOf(Scene.Scene2D, ref.target) ? [[ref.target.key, ref.target]] : [])),
  );
  for (const { relation, canvas } of losers) {
    const copy = canvasDocument(canvas);
    for (const layout of copy.layouts) {
      const before = baseLayouts.get(layout.id);
      const target = winnerLayouts.get(layout.id);
      if (layout.dim === '2d' && before && target) {
        replayLayout(target, before, layout);
      }
    }
    for (const scene of copy.scenes) {
      const before = baseScenes.get(scene.id);
      const target = winnerScenes.get(scene.id);
      if (scene.dim === '2d' && before?.dim === '2d' && target) {
        Obj.update(target, (target) => {
          replayFields(target, { camera: before.camera }, { camera: scene.camera });
        });
      }
    }
    Obj.update(winner, (winner) => {
      replayFields(winner.settings, baseSettings, canvas.settings);
    });
    yield* Database.remove(relation);
    removeCanvas(canvas);
  }
  return true;
});
