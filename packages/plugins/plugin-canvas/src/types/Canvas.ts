//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** Discriminates the base `Drawing.Canvas` as scene-engine content (see `model/content.ts`); new canvases are written at it. */
export const SCENE_SCHEMA = 'dxos.org/scene/2';

/** The revision every canvas was stored at before content migrations; `model/migrations.ts` upgrades it. */
export const SCENE_SCHEMA_V1 = 'dxos.org/scene/1';

/** Whether a canvas `schema` is scene content at any revision, since a canvas may sync in before it is migrated. */
export const isSceneSchema = (schema: string | undefined): boolean =>
  schema !== undefined && /^dxos\.org\/scene\/\d+$/.test(schema);

/**
 * plugin-tldraw's `Tldraw.TLDRAW_SCHEMA`: the dialect of a drawing that the tldraw converter reads. Named here so the plugin
 * takes no dependency on the tldraw packages; a test holds the two equal.
 */
export const TLDRAW_SCHEMA = 'tldraw.com/2';
