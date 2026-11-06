//
// Copyright 2026 DXOS.org
//

//
// The legacy scene migration: the only reader of the View records a scene drawing stored before `Canvas` (a
// `Drawing.Canvas` of `dxos.org/scene/<n>` records). Each View becomes a Layout2D with a Scene2D over it, the objects
// its portals and instances place become one Model2D, and the settings and style classes move onto the Canvas. It runs
// over every drawing of a space when the space loads (`migrateLegacyDrawings`), since ECHO's migrations map one stored
// type to another in place and cannot make the objects a canvas is drawn from.
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SCRIPT_CAMERA_TARGET, Timeline, trackId } from '@dxos/animation';
import { Database, Filter, Migration, Obj, Query, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import * as Animation from '@dxos/plugin-animator/Animation';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { fromRenderList2D, namedStyles } from '@dxos/react-ui-canvas/headless';
import { type RenderList2D } from '@dxos/react-ui-canvas/headless';
import { Scene, type StyleMap, bounds2D, toEcho } from '@dxos/scene';
import { CreatedFrom } from '@dxos/types';

import { Canvas } from '#types';

import { canvasDocument, loadCanvas, removeCanvas } from './canvas-document.ts';
import {
  LEGACY_ROOT_VIEW_ID,
  ROOT_VIEW_ID,
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
  sceneKey,
} from './content.ts';
import { adoptLayoutMode, withoutMode, withSettingsMode } from './layout-mode.ts';
import { SceneMigrations } from './migrations.ts';
import { plain } from './records.ts';

/** The one model a migrated canvas's portals and instances place their objects from. */
const MODEL_ID = 'model';

/** The object id an `instance` node of a composite places, which an unplaced composite takes as well. */
const COMPOSITE_PREFIX = 'instance:';

/** Each record's DSL identity as its element's `dsl` field, which the illustrator's commands find elements by. */
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
        return [id, dsl ? { ...element, dsl: clone(dsl) } : element];
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
export const legacyDocument = (content: Drawing.Canvas['content'], classes: StyleMap = {}): Scene.SceneDocument => {
  const copy = clone(content);
  migrateContent(copy);
  migrateLayers(copy);
  pruneOrphanedViews(copy);
  const root = rootOf(copy);
  const views: RenderList2D[] = Object.values(readViews(copy)).sort(
    (left, right) => Number(right.id === root) - Number(left.id === root),
  );
  const objects: Record<string, Scene.Object2D> = {};
  // The canvas's mode, named once for every View, becomes each layout's own.
  const settings = canvasRecordOf(copy) ?? {};
  const layouts = views.map((view) => {
    const { layout, objects: placed } = fromRenderList2D(view);
    placed.forEach((object) => (objects[object.id] = object));
    return withSettingsMode(withIdentities(layout, copy), settings);
  });
  // A composite no node places yet (a library definition) is reached through an object of its own, or a canvas
  // opened at its root would never read it.
  const placedParts = new Set(Object.values(objects).flatMap((object) => (object.parts ? [object.parts] : [])));
  for (const layout of layouts.slice(1)) {
    if (!placedParts.has(layout.id)) {
      const id = `${COMPOSITE_PREFIX}${layout.id}`;
      objects[id] = { id, type: 'rect', parts: layout.id };
    }
  }
  // The style classes become the model's named styles, so a canvas with classes has a model even with no objects.
  const styles = namedStyles(classes);
  const hasStyles = Object.keys(styles).length > 0;
  const hasModel = Object.keys(objects).length > 0 || hasStyles;
  const withModel = layouts.map((layout) => (hasModel ? { ...layout, model: MODEL_ID } : layout));
  return {
    scenes: withModel.map(sceneOf),
    layouts: withModel,
    models: hasModel ? [{ id: MODEL_ID, dim: '2d', objects, ...(hasStyles ? { styles } : {}) }] : [],
  };
};

/** A canvas node's track property as the element path it keys: its inline style is the element's overrides. */
export const legacyElementPath = (property: string): string =>
  property.startsWith('style.')
    ? `overrides.${property.slice('style.'.length)}`
    : property === 'text'
      ? 'label'
      : property;

/**
 * A timeline a canvas View stored as a shot staging the View's migrated scene: the same duration and keys, each node
 * track keying the element of the same id at its element path; the camera's tracks are the scene stage's as they are.
 */
export const migrateTimeline = (timeline: Timeline, stage: Ref.Ref<Obj.Unknown>): Animation.Shot => ({
  ...Animation.makeShot(stage, timeline.duration),
  timeline: {
    ...timeline,
    tracks: Object.fromEntries(
      Object.values(timeline.tracks).map((track) => {
        const property = track.target === SCRIPT_CAMERA_TARGET ? track.property : legacyElementPath(track.property);
        return [trackId(track.target, property), { ...track, property }];
      }),
    ),
  },
});

const isTimeline = Schema.is(Timeline);

/** The shots the timelines of a legacy canvas's Views become, one per View with keyed tracks, over its scene. */
const legacyShots = (
  content: Drawing.Canvas['content'],
  scenes: ReadonlyMap<string, Scene.Scene2D | Scene.Scene3D>,
): Animation.Shot[] =>
  [...scenes.values()].flatMap((scene) => {
    // The legacy root View was renamed to the root on reading, so its record is still under the legacy id.
    const record =
      content[sceneKey(scene.key)] ?? (scene.key === ROOT_VIEW_ID ? content[sceneKey(LEGACY_ROOT_VIEW_ID)] : undefined);
    const timeline = fieldsOf(record).timeline;
    return isTimeline(timeline) && Object.keys(timeline.tracks).length > 0
      ? [migrateTimeline(clone(timeline), Ref.make(scene))]
      : [];
  });

/**
 * Migrates `drawing` when its canvas is a current-revision scene canvas, repointing it at a new `Canvas` in one
 * change; any other drawing (tldraw, excalidraw, one already migrated, one a newer plugin wrote) is left as it is.
 * The legacy canvas is kept, unreferenced. Returns whether it changed anything.
 */
export const migrateSceneDrawing = Effect.fn(function* (drawing: Drawing.Drawing) {
  const legacy = yield* Database.load(drawing.canvas);
  // A newer plugin's records may hold fields this one would drop in moving them.
  if (!Drawing.isCanvas(legacy) || !Canvas.isSceneSchema(legacy.schema) || Canvas.isNewerScene(legacy.schema)) {
    return false;
  }
  // A canvas that synced in before its content steps ran is read through them, as they would write it.
  const { content, styles } = upgradedContent(legacy);
  const stored = toEcho(legacyDocument(content, readStyles(styles)));
  for (const object of [...stored.models.values(), ...stored.layouts.values(), ...stored.scenes.values()]) {
    yield* Database.add(object);
  }
  const { kind: _kind, root: _root, ...settings } = clone(canvasRecordOf(content) ?? { kind: 'canvas', root: '' });
  const model = stored.models.get(MODEL_ID);
  const canvas = yield* Database.add(
    Obj.make(Canvas.Canvas, {
      // The mode moved onto the layouts with them.
      settings: withoutMode(settings),
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
  // Canvas animation is the animator's (decision 16): the timelines Views stored become one animation's shots.
  const shots = legacyShots(content, stored.scenes);
  if (shots.length > 0) {
    yield* Database.add(Obj.make(Animation.Animation, { name: drawing.name, fps: Animation.DEFAULT_FPS, shots }));
  }
  Obj.update(drawing, (drawing) => {
    drawing.canvas = Ref.make(canvas);
  });
  return true;
});

const MIGRATION = 'migration';

const isContentMap = (value: unknown): value is Drawing.Canvas['content'] =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A legacy canvas's records and style classes at the current scene revision, read without writing the canvas. */
const upgradedContent = (
  legacy: Drawing.Canvas,
): { content: Drawing.Canvas['content']; styles: Record<string, unknown> } => {
  const { content } = Migration.upgradeContent(SceneMigrations, Drawing.Canvas, legacy.schema, {
    content: clone(legacy.content),
    styles: clone(legacy.styles ?? {}),
  });
  return {
    content: isContentMap(content.content) ? content.content : {},
    styles: isContentMap(content.styles) ? content.styles : {},
  };
};

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
 * Moves onto `winner` what only the losing `canvas` made during the race: its layouts and scenes whose keys neither the
 * legacy content nor the winner has, and the model objects the winner lacks. They are moved, not copied, so the
 * loser's removal leaves them, and the Refs between them (a composite's parts) still hold.
 */
const adoptNew = (
  winner: Canvas.Canvas,
  canvas: Canvas.Canvas,
  known: { layouts: Set<string>; scenes: Set<string> },
) => {
  const layouts = canvas.layouts.flatMap((ref) =>
    Obj.instanceOf(Scene.Layout2D, ref.target) && !known.layouts.has(ref.target.key) ? [ref.target] : [],
  );
  const scenes = canvas.scenes.flatMap((ref) =>
    Obj.instanceOf(Scene.Scene2D, ref.target) && !known.scenes.has(ref.target.key) ? [ref.target] : [],
  );
  const models = [
    canvas.model?.target,
    ...canvas.layouts.map((ref) => (Obj.instanceOf(Scene.Layout2D, ref.target) ? ref.target.model?.target : undefined)),
  ].filter((model) => Obj.instanceOf(Scene.Model2D, model));
  // The winner's root layout reads objects from its own model when the canvas lists none; adoption never moves it off.
  const winnerRoot = winner.scenes[0]?.target;
  const winnerRootLayout = Obj.instanceOf(Scene.Scene2D, winnerRoot) ? winnerRoot.layout.target : undefined;
  const winnerModel =
    winner.model?.target ??
    (Obj.instanceOf(Scene.Layout2D, winnerRootLayout) ? winnerRootLayout.model?.target : undefined);
  const target = Obj.instanceOf(Scene.Model2D, winnerModel) ? winnerModel : undefined;
  // A Ref to a loser's layout that is not moved goes to the winner's layout of that key, since the loser's is removed.
  const winnerLayouts = new Map(
    winner.layouts.flatMap((ref) => (Obj.instanceOf(Scene.Layout2D, ref.target) ? [[ref.target.key, ref.target]] : [])),
  );
  const remap = (layout: unknown): Scene.Layout2D | undefined =>
    Obj.instanceOf(Scene.Layout2D, layout)
      ? layouts.includes(layout)
        ? layout
        : (winnerLayouts.get(layout.key) ?? layout)
      : undefined;
  const missing = models.flatMap((model) =>
    Object.entries(model.objects).filter(([id]) => !target || target.objects[id] === undefined),
  );
  // Without a model of its own, the winner takes the loser's whole, so the parts Refs need no rewriting.
  const adoptedModel = target === undefined && missing.length > 0 ? models[0] : undefined;
  if (target && missing.length > 0) {
    Obj.update(target, (target) => {
      for (const [id, object] of missing) {
        const { parts, ...fields } = object;
        const layout = remap(parts?.target);
        target.objects[id] = { ...plain(fields), ...(layout ? { parts: Ref.make(layout) } : {}) };
      }
    });
  }
  const model = target ?? adoptedModel;
  Obj.update(canvas, (canvas) => {
    canvas.layouts = canvas.layouts.filter((ref) => !layouts.some((layout) => layout === ref.target));
    canvas.scenes = canvas.scenes.filter((ref) => !scenes.some((scene) => scene === ref.target));
    adoptedModel && (canvas.model = undefined);
  });
  // The loser's own layouts still name the adopted model, and removing the loser removes every model they name.
  for (const ref of canvas.layouts) {
    const layout = ref.target;
    adoptedModel &&
      Obj.instanceOf(Scene.Layout2D, layout) &&
      layout.model?.target === adoptedModel &&
      Obj.update(layout, (layout) => (layout.model = undefined));
  }
  for (const layout of layouts) {
    model && layout.model?.target !== model && Obj.update(layout, (layout) => (layout.model = Ref.make(model)));
  }
  adoptedModel &&
    Obj.update(adoptedModel, (adoptedModel) => {
      for (const object of Object.values(adoptedModel.objects)) {
        const layout = remap(object.parts?.target);
        layout && layout !== object.parts?.target && (object.parts = Ref.make(layout));
      }
    });
  for (const scene of scenes) {
    const layout = remap(scene.layout.target);
    layout && layout !== scene.layout.target && Obj.update(scene, (scene) => (scene.layout = Ref.make(layout)));
  }
  Obj.update(winner, (winner) => {
    winner.layouts.push(...layouts.map((layout) => Ref.make(layout)));
    winner.scenes.push(...scenes.map((scene) => Ref.make(scene)));
    adoptedModel && (winner.model = Ref.make(adoptedModel));
  });
  // The winner's root layout places the adopted objects; with no model of its own it reads them from the adopted one.
  model &&
    Obj.instanceOf(Scene.Layout2D, winnerRootLayout) &&
    winnerRootLayout.model === undefined &&
    Obj.update(winnerRootLayout, (winnerRootLayout) => (winnerRootLayout.model = Ref.make(model)));
};

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
  yield* loadCanvas(winner);
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
  for (const { canvas } of losers) {
    yield* loadCanvas(canvas);
  }
  const legacyContent = upgradedContent(legacy).content;
  const base = legacyDocument(legacyContent);
  const baseLayouts = new Map(base.layouts.flatMap((layout) => (layout.dim === '2d' ? [[layout.id, layout]] : [])));
  const baseScenes = new Map(base.scenes.map((scene) => [scene.id, scene]));
  const baseSettings = (() => {
    const {
      kind: _kind,
      root: _root,
      ...settings
    } = clone(canvasRecordOf(legacyContent) ?? { kind: 'canvas', root: '' });
    return withoutMode(settings);
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
    adoptNew(winner, canvas, {
      layouts: new Set([...baseLayouts.keys(), ...winnerLayouts.keys()]),
      scenes: new Set([...baseScenes.keys(), ...winnerScenes.keys()]),
    });
    yield* Database.remove(relation);
    removeCanvas(canvas);
  }
  return true;
});

/** The `Canvas` a legacy canvas was migrated onto and still survives as, after any reconciliation. */
const migratedFrom = Effect.fn(function* (legacy: Drawing.Canvas) {
  const relations = yield* Database.query(Query.select(Filter.id(legacy.id)).targetOf(CreatedFrom.CreatedFrom)).run;
  const canvas = relations
    .filter((relation) => relation.reason === MIGRATION)
    .map((relation) => Relation.getSource(relation))
    .find((source) => Canvas.isCanvas(source));
  return Canvas.isCanvas(canvas) ? canvas : undefined;
});

/**
 * Restages every animation shot a legacy canvas staged on the root scene of the canvas it migrated onto, its node
 * tracks keying the same elements at their element paths, since no stage draws a legacy canvas. Returns how many it
 * restaged.
 */
export const restageAnimations = Effect.fn(function* () {
  const animations = yield* Database.query(Filter.type(Animation.Animation)).run;
  let restaged = 0;
  for (const animation of animations) {
    for (const [index, shot] of animation.shots.entries()) {
      const stage = yield* Database.load(shot.stage).pipe(
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)),
      );
      if (!Drawing.isCanvas(stage) || !Canvas.isSceneSchema(stage.schema)) {
        continue;
      }
      const canvas = yield* migratedFrom(stage);
      const scene = canvas && (yield* Database.load(canvas.scenes[0]));
      if (!Obj.instanceOf(Scene.Scene2D, scene)) {
        continue;
      }
      const { timeline } = migrateTimeline(clone(shot.timeline), Ref.make(scene));
      Obj.update(animation, (animation) => {
        Obj.setValue(animation, ['shots', index, 'stage'], Ref.make(scene));
        Obj.setValue(animation, ['shots', index, 'timeline'], timeline);
      });
      restaged++;
    }
  }
  return restaged;
});

/** A step that fails for one drawing is logged and skipped, so the rest of the space still migrates. */
const warnOnFailure =
  (message: string, drawing: Drawing.Drawing) =>
  <E, R>(effect: Effect.Effect<boolean, E, R>): Effect.Effect<boolean, never, R> =>
    effect.pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn(message, { drawing: drawing.id, error });
          return false;
        }),
      ),
    );

/**
 * Moves every legacy scene drawing of the space onto a `Canvas` (`migrateSceneDrawing`), folds into one the copies two
 * peers made of the same drawing at once (`reconcileMigrations`), restages the animations that staged a legacy canvas
 * (`restageAnimations`), and moves a mode a canvas's settings still name onto its layouts (`adoptLayoutMode`).
 * Idempotent: a second pass finds nothing to do. A drawing that fails to migrate keeps its legacy canvas until the
 * next pass.
 */
export const migrateLegacyDrawings = Effect.fn('migrateLegacyDrawings')(function* () {
  const drawings = yield* Database.query(Filter.type(Drawing.Drawing)).run;
  let migrated = 0;
  let reconciled = 0;
  for (const drawing of drawings) {
    (yield* migrateSceneDrawing(drawing).pipe(warnOnFailure('legacy drawing not migrated', drawing))) && migrated++;
  }
  for (const drawing of drawings) {
    (yield* reconcileMigrations(drawing).pipe(warnOnFailure('migrated drawing not reconciled', drawing))) &&
      reconciled++;
  }
  const restaged = yield* restageAnimations();
  let adopted = 0;
  for (const canvas of yield* Database.query(Filter.type(Canvas.Canvas)).run) {
    yield* loadCanvas(canvas);
    adoptLayoutMode(canvas) && adopted++;
  }
  return { migrated, reconciled, restaged, adopted };
});
