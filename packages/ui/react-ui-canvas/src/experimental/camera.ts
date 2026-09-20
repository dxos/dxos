//
// Copyright 2026 DXOS.org
//

import { interpolateZoom } from 'd3';

import {
  type Bounds,
  type Camera,
  type PlacedCell,
  type Point,
  type Scene,
  type SceneCell,
  type Size,
} from './types.ts';

export const MIN_ZOOM = 1 / 32;
export const MAX_ZOOM = 32;

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
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const anchor = screenToScene(camera, screen);
  return { zoom: clamped, x: screen.x / clamped - anchor.x, y: screen.y / clamped - anchor.y };
};

export const cameraTransform = (camera: Camera) => `scale(${camera.zoom}) translate(${camera.x}px, ${camera.y}px)`;

export const cellBounds = (cell: PlacedCell): Bounds => ({
  x: cell.center.x - cell.size.width / 2,
  y: cell.center.y - cell.size.height / 2,
  width: cell.size.width,
  height: cell.size.height,
});

export const screenBounds = (camera: Camera, bounds: Bounds): Bounds => {
  const origin = sceneToScreen(camera, bounds);
  return { ...origin, width: bounds.width * camera.zoom, height: bounds.height * camera.zoom };
};

export const fitBounds = (bounds: Bounds, viewport: Size, inset = 0): Camera => {
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(
      MIN_ZOOM,
      Math.min(viewport.width / (bounds.width + 2 * inset), viewport.height / (bounds.height + 2 * inset)),
    ),
  );
  return {
    zoom,
    x: viewport.width / (2 * zoom) - (bounds.x + bounds.width / 2),
    y: viewport.height / (2 * zoom) - (bounds.y + bounds.height / 2),
  };
};

/** Uniform scale that maps the child scene's bounds into the portal cell. */
export const portalScale = (cell: SceneCell, child: Scene) =>
  Math.min(cell.size.width / child.bounds.width, cell.size.height / child.bounds.height);

/** Child-scene CSS transform inside a portal cell whose own origin is the cell's top-left. */
export const portalTransform = (cell: SceneCell, child: Scene) => {
  const scale = portalScale(cell, child);
  return `scale(${scale}) translate(${-child.bounds.x}px, ${-child.bounds.y}px)`;
};

/**
 * Re-express a parent-space camera in child-scene space so the swap is visually seamless:
 * screen = (parentPoint + cam) * zoom and parentPoint = cellOrigin + (childPoint - childOrigin) * s.
 */
export const enterPortal = (camera: Camera, cell: SceneCell, child: Scene): Camera => {
  const scale = portalScale(cell, child);
  const origin = cellBounds(cell);
  return {
    zoom: camera.zoom * scale,
    x: (origin.x - child.bounds.x * scale + camera.x) / scale,
    y: (origin.y - child.bounds.y * scale + camera.y) / scale,
  };
};

/** Inverse of `enterPortal`. */
export const exitPortal = (camera: Camera, cell: SceneCell, child: Scene): Camera => {
  const scale = portalScale(cell, child);
  const origin = cellBounds(cell);
  return {
    zoom: camera.zoom / scale,
    x: camera.x * scale - origin.x + child.bounds.x * scale,
    y: camera.y * scale - origin.y + child.bounds.y * scale,
  };
};

/** Fraction of the viewport covered by the bounds' screen rectangle. */
export const coverage = (camera: Camera, bounds: Bounds, viewport: Size) => {
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

/** Animate between cameras; returns a cancel function. */
export const animateCamera = (
  from: Camera,
  to: Camera,
  viewport: Size,
  apply: (camera: Camera) => void,
  done?: () => void,
): (() => void) => {
  const interpolate = interpolateZoom(toView(from, viewport), toView(to, viewport));
  const duration = Math.min(800, Math.max(250, interpolate.duration));
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
