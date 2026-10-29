//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6-§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { type CSSProperties } from 'react';

/** On-screen dot spacing (px) outside which a dot level is not drawn: denser dots read as a tone, not a grid. */
export const DOTS_RANGE: [number, number] = [12, 2048];

/** Milliseconds the camera's zoom must hold still before the background grid fades back in. */
export const ZOOM_SETTLE = 250;

/** Major cells between the scene's frame and the viewport edge when fitting; `margin` overrides it. */
export const DEFAULT_MARGIN = 2;

/** Zoom factor of one toolbar step. */
export const ZOOM_STEP = 1.25;

/** The first breadcrumb in isolation, which reads `Objects` and leads back out. */
export const OBJECTS_CRUMB = '\u0000objects';

/**
 * The light scheme scoped on the canvas under a dark app: the theme's tokens resolve with `light-dark()` against the
 * element's colour scheme, and the variables the `.dark` class sets go back to the root's light values.
 */
export const LIGHT_MODE: CSSProperties & Record<`--${string}`, string> = {
  'colorScheme': 'light',
  'color': 'var(--color-fg)',
  '--surface-bg': 'var(--color-base-surface)',
  '--foreground': 'var(--color-fg)',
  '--description-text': 'var(--color-fg-muted)',
  '--dx-lift': '-1',
  '--dx-attenuate-state': '0.5',
  '--dx-attenuate-well': '0.5',
  '--dx-attenuate-separator': '0.75',
  '--dx-attenuate-separator-line': '0.45',
};
