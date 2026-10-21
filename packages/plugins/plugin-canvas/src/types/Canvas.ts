//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

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
