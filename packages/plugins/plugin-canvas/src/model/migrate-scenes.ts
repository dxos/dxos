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

import { Database, Obj, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type View } from '@dxos/react-ui-canvas/headless';
import { fromCanvasView } from '@dxos/react-ui-scene/canvas';
import { Scene, bounds2D, toEcho } from '@dxos/scene';

import { Canvas } from '#types';

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
  Obj.update(drawing, (drawing) => {
    drawing.canvas = Ref.make(canvas);
  });
  return true;
});
