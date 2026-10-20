//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** Discriminates the base `Drawing.Canvas` as scene-engine content (see `model/content.ts`). */
export const SCENE_SCHEMA = 'dxos.org/scene/1';

/**
 * plugin-tldraw's `Tldraw.TLDRAW_SCHEMA`: the dialect of a drawing that the tldraw converter reads. Named here so the plugin
 * takes no dependency on the tldraw packages; a test holds the two equal.
 */
export const TLDRAW_SCHEMA = 'tldraw.com/2';
