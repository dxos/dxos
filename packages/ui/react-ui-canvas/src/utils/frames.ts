//
// Copyright 2026 DXOS.org
//

import { type Bounds, MAJOR_GRID_RATIO, type Size } from '@dxos/scene';

import { type Node, type View } from '../model/index.ts';
import { portalFrame } from './camera.ts';
import { contentBounds } from './hit.ts';
import { nodeBounds } from './shapes.ts';

/** An empty root has nothing to frame: fitting it centres the origin at true size. */
export const EMPTY_FRAME: Bounds = { x: 0, y: 0, width: 0, height: 0 };

/**
 * What an empty scene is framed as through `portal`: about the viewport, centred on its origin, so drilling into a blank
 * frame zooms until the frame fills the view rather than staying put on a zero-size box. Its size is the portal's times a
 * power of the grid ratio, so the grid's levels in the child line up with the parent's when the scenes swap.
 */
export const emptyBounds = (portal: Node, viewport: Size): Bounds => {
  const { width, height } = nodeBounds(portal);
  const fill = Math.min(viewport.width / width, viewport.height / height);
  const scale = MAJOR_GRID_RATIO ** Math.max(0, Math.round(Math.log(fill) / Math.log(MAJOR_GRID_RATIO)));
  return { x: (-width * scale) / 2, y: (-height * scale) / 2, width: width * scale, height: height * scale };
};

/** The shapes of a scene, unpadded: what Fit frames, with its inset as the only margin. */
export const fitFrame = (scene: View): Bounds => contentBounds(scene, 0, 1) ?? EMPTY_FRAME;

/** A child scene's frame inside its portal, as drilling in maps it; an empty one stands in as the viewport. */
export const childFrame = (portal: Node, child: View, viewport: Size): Bounds =>
  portalFrame(portal, contentBounds(child) ?? emptyBounds(portal, viewport));
