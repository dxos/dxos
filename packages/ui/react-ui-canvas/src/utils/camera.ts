//
// Copyright 2026 DXOS.org
//

//
// Camera math (docs/DESIGN.md §5): per-scene coordinates, one CSS transform for the camera, and the
// portal mapping that lets a camera be re-expressed in a child scene's space so drill-in is seamless.
//

import { interpolateZoom } from 'd3';

import {
  type Bounds,
  type Camera,
  MAJOR_GRID,
  MAJOR_GRID_RATIO,
  type Node,
  type Point,
  type Size,
} from '../model/types.ts';
import { nodeBounds } from './shapes.ts';

export const MIN_ZOOM = 1 / 32;
export const MAX_ZOOM = 32;

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const sceneToScreen = (camera: Camera, point: Point): Point => ({
  x: (point.x + camera.x) * camera.zoom,
  y: (point.y + camera.y) * camera.zoom,
});

export const screenToScene = (camera: Camera, point: Point): Point => ({
  x: point.x / camera.zoom - camera.x,
  y: point.y / camera.zoom - camera.y,
});

/** Change zoom while keeping the scene point under `screen` fixed. */
export const zoomAt = (camera: Camera, screen: Point, zoom: number): Camera => {
  const clamped = clampZoom(zoom);
  const anchor = screenToScene(camera, screen);
  return { zoom: clamped, x: screen.x / clamped - anchor.x, y: screen.y / clamped - anchor.y };
};

export const panBy = (camera: Camera, delta: Point): Camera => ({
  ...camera,
  x: camera.x + delta.x,
  y: camera.y + delta.y,
});

export const cameraTransform = (camera: Camera) => `scale(${camera.zoom}) translate(${camera.x}px, ${camera.y}px)`;

export const boundsCenter = (bounds: Bounds): Point => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

export const screenBounds = (camera: Camera, bounds: Bounds): Bounds => {
  const origin = sceneToScreen(camera, bounds);
  return { ...origin, width: bounds.width * camera.zoom, height: bounds.height * camera.zoom };
};

/**
 * Camera that centres `bounds` in the viewport at the largest zoom that fits it with `inset` px around,
 * never above `maxZoom` (a small region is centred rather than blown up past it).
 */
export const fitBounds = (bounds: Bounds, viewport: Size, inset = 0, maxZoom = MAX_ZOOM): Camera => {
  const zoom = clampZoom(
    Math.min(maxZoom, viewport.width / (bounds.width + 2 * inset), viewport.height / (bounds.height + 2 * inset)),
  );
  return {
    zoom,
    x: viewport.width / (2 * zoom) - (bounds.x + bounds.width / 2),
    y: viewport.height / (2 * zoom) - (bounds.y + bounds.height / 2),
  };
};

/** Uniform scale that maps a child-space region into the portal node (letterboxed). */
export const portalScale = (portal: Node, region: Bounds) => {
  const { width, height } = nodeBounds(portal);
  return Math.min(width / region.width, height / region.height);
};

/**
 * The frame a portal gives its child: the child-space region that maps exactly onto the portal. It is
 * the portal's box scaled by the smallest power of the grid ratio, at least one, that contains the child's
 * derived bounds, placed on the major grid scaled by that factor as near their centre as containing them
 * allows. A power of the ratio maps every child grid level onto a parent level (the child's major grid is
 * the parent's minor one, one level down), and placing the frame on the scaled grid puts the child's lines
 * on the parent's, not merely at their spacing, so the grids stay aligned through a drill-in. Drilling in
 * shows this frame; a portal draws the child centred in it.
 */
export const portalFrame = (portal: Node, child: Bounds, unit = MAJOR_GRID, ratio = MAJOR_GRID_RATIO): Bounds => {
  const { width, height } = nodeBounds(portal);
  let factor = ratio;
  while (factor * width < child.width || factor * height < child.height) {
    factor *= ratio;
  }
  const frame = { width: width * factor, height: height * factor };
  return {
    x: place(child.x, child.width, frame.width, unit * factor),
    y: place(child.y, child.height, frame.height, unit * factor),
    ...frame,
  };
};

/** The grid-aligned start of a span of `length` centred on `[start, start + inner]` as far as containing it allows. */
const place = (start: number, inner: number, length: number, unit: number): number => {
  const centred = Math.round((start + inner / 2 - length / 2) / unit) * unit;
  // Rounding a small negative yields -0, which `toEqual` and `Object.is` tell apart from 0.
  return Math.max(Math.min(centred, start), start + inner - length) + 0;
};

/** Child-scene CSS transform inside a portal node whose own origin is the node's top-left. */
export const portalTransform = (portal: Node, frame: Bounds) => {
  const scale = portalScale(portal, frame);
  return `scale(${scale}) translate(${-frame.x}px, ${-frame.y}px)`;
};

/**
 * Re-express a parent-space camera in child-scene space so the swap is visually seamless:
 * screen = (parentPoint + cam) * zoom and parentPoint = portalOrigin + (childPoint - childOrigin) * s.
 */
export const enterPortal = (camera: Camera, portal: Node, child: Bounds): Camera => {
  const scale = portalScale(portal, child);
  const origin = nodeBounds(portal);
  return {
    zoom: camera.zoom * scale,
    x: (origin.x - child.x * scale + camera.x) / scale,
    y: (origin.y - child.y * scale + camera.y) / scale,
  };
};

/** Inverse of `enterPortal`. */
export const exitPortal = (camera: Camera, portal: Node, child: Bounds): Camera => {
  const scale = portalScale(portal, child);
  const origin = nodeBounds(portal);
  return {
    zoom: camera.zoom / scale,
    x: camera.x * scale - origin.x + child.x * scale,
    y: camera.y * scale - origin.y + child.y * scale,
  };
};

/** Fraction of the viewport covered by the bounds' screen rectangle. */
export const coverage = (camera: Camera, bounds: Bounds, viewport: Size) => {
  if (viewport.width === 0 || viewport.height === 0) {
    return 0;
  }
  const rect = screenBounds(camera, bounds);
  const width = Math.max(0, Math.min(rect.x + rect.width, viewport.width) - Math.max(rect.x, 0));
  const height = Math.max(0, Math.min(rect.y + rect.height, viewport.height) - Math.max(rect.y, 0));
  return (width * height) / (viewport.width * viewport.height);
};

// van Wijk & Nuij: the camera is (centre, visible width) so a zoom-out-then-in trajectory falls out of d3.
const toView = (camera: Camera, viewport: Size): [number, number, number] => [
  viewport.width / (2 * camera.zoom) - camera.x,
  viewport.height / (2 * camera.zoom) - camera.y,
  viewport.width / camera.zoom,
];

const fromView = ([cx, cy, width]: [number, number, number], viewport: Size): Camera => {
  const zoom = viewport.width / width;
  return { zoom, x: viewport.width / (2 * zoom) - cx, y: viewport.height / (2 * zoom) - cy };
};

export const MIN_ANIMATION_MS = 250;
export const MAX_ANIMATION_MS = 800;

/** Animate between cameras; returns a cancel function. */
export const animateCamera = (
  from: Camera,
  to: Camera,
  viewport: Size,
  apply: (camera: Camera) => void,
  done?: () => void,
): (() => void) => {
  const interpolate = interpolateZoom(toView(from, viewport), toView(to, viewport));
  const duration = Math.min(MAX_ANIMATION_MS, Math.max(MIN_ANIMATION_MS, interpolate.duration));
  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    apply(fromView(interpolate(eased), viewport));
    if (t < 1) {
      frame = requestAnimationFrame(tick);
    } else {
      done?.();
    }
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
};
