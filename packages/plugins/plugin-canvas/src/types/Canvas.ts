//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { BackgroundGrid } from '@dxos/react-ui-canvas/headless';
import { StyleClass } from '@dxos/scene';

/** The scene revision this plugin reads and writes; a canvas at a later one was written by a newer plugin. */
export const SCENE_REVISION = 2;

/** Discriminates the base `Drawing.Canvas` as scene-engine content (see `model/content.ts`); new canvases are written at it. */
export const SCENE_SCHEMA = `dxos.org/scene/${SCENE_REVISION}`;

/** The revision every canvas was stored at before content migrations; `model/migrations.ts` upgrades it. */
export const SCENE_SCHEMA_V1 = 'dxos.org/scene/1';

/** The revision of a scene `schema`, or undefined for another dialect. */
export const sceneRevision = (schema: string | undefined): number | undefined => {
  const match = schema?.match(/^dxos\.org\/scene\/(\d+)$/);
  return match ? Number(match[1]) : undefined;
};

/** Whether a canvas `schema` is scene content at any revision, since a canvas may sync in before it is migrated. */
export const isSceneSchema = (schema: string | undefined): boolean => sceneRevision(schema) !== undefined;

/**
 * Whether a canvas was written by a newer plugin: its format may hold fields this one does not know, so writing it
 * here could drop them, and it is shown read-only until the plugin updates.
 */
export const isNewerScene = (schema: string | undefined): boolean => (sceneRevision(schema) ?? 0) > SCENE_REVISION;

/**
 * plugin-tldraw's `Tldraw.TLDRAW_SCHEMA`: the dialect of a drawing that the tldraw converter reads. Named here so the plugin
 * takes no dependency on the tldraw packages; a test holds the two equal.
 */
export const TLDRAW_SCHEMA = 'tldraw.com/2';

/** A drawing's settings, which every collaborator sees; each viewer's own choices are kept in their view state. */
export const CanvasSettings = Schema.Struct({
  /** Shapes snap to the lattice's cells and links route along its gutters. */
  lattice: Schema.optional(Schema.Boolean),
  /** The mode the canvas opens in; unset is `freehand`, or `lattice` while `lattice` is set. */
  projection: Schema.optional(Schema.Literals(['freehand', 'lattice', 'constrained', 'dynamic'])),
  /** Minor grid spacing in scene px; the engine's default when unset. */
  grid: Schema.optional(Schema.Number),
  /** Opens read-only for a viewer who has not chosen otherwise (their view state's `readonly` wins). */
  readonly: Schema.optional(Schema.Boolean),
  /** The theme every collaborator sees, over each one's own default; an id the theme registry resolves. */
  theme: Schema.optional(Schema.String),
  /** Overrides the theme's style set. */
  styleSet: Schema.optional(Schema.String),
  /** Overrides the theme's background. */
  background: Schema.optional(Schema.String),
  /** Overrides the background's grid. */
  backgroundGrid: Schema.optional(BackgroundGrid),
  /**
   * The illustrator DSL's elements draw as the diagram's own SVG renderer draws them (diagram nodes and connectors)
   * rather than as canvas shapes: a laid-out diagram brought onto the canvas keeps the look it had.
   */
  diagramShapes: Schema.optional(Schema.Boolean),
});
export type CanvasSettings = Schema.Schema.Type<typeof CanvasSettings>;

export type CanvasProjection = NonNullable<CanvasSettings['projection']>;

/** The mode a canvas opens in. */
export const projectionOf = (settings: CanvasSettings): CanvasProjection =>
  settings.projection ?? (settings.lattice ? 'lattice' : 'freehand');

/**
 * This plugin's canvas: the drawing's settings and named style classes, and its content as `@dxos/scene` objects — a
 * model of reusable objects, the layouts that place them, and the scenes that view a layout through a camera. The
 * first scene is the one a drawing opens at. A `Drawing.canvas` names it; it is never listed on its own.
 */
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.canvas.canvas', '0.1.0'))(
  Schema.Struct({
    settings: CanvasSettings,
    styles: Schema.optional(Schema.Record(Schema.String, StyleClass)),
    /** A `Model2D` or `Model3D`. */
    model: Schema.optional(Ref.Ref(Obj.Unknown)),
    /** `Layout2D` or `Layout3D` objects. */
    layouts: Schema.Array(Ref.Ref(Obj.Unknown)),
    /** `Scene2D` or `Scene3D` objects; the first is the one the drawing opens at. */
    scenes: Schema.Array(Ref.Ref(Obj.Unknown)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'sky' })),
) {}

export const isCanvas = (object: unknown): object is Canvas => Obj.instanceOf(Canvas, object);
