//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { type Scene, resolveLayout3D } from '@dxos/scene';

import {
  type GeometrySource,
  SceneRenderer3D,
  type Theme3D,
  loadManifold,
  manifoldGeometry,
  orbitBy,
  panBy,
  zoomBy,
} from '../../three/index.ts';
import { orbitGesture, wheelGesture } from './orbit-gesture.ts';

export const DEFAULT_CAMERA: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: -45,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

/** A CSS colour as `#rrggbb`, resolved through a 2D canvas so any CSS colour form reads. */
const cssColorToHex = (color: string, fallback: string): string => {
  const context = document.createElement('canvas').getContext('2d');
  if (!context || !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return fallback;
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

/** Whether drawing the document needs Manifold: a layout has a solid or a rounded cube. */
const needsManifold = (doc: Scene.SceneDocument): boolean =>
  doc.layouts.some(
    (layout) =>
      layout.dim === '3d' &&
      Object.values(resolveLayout3D(doc, layout)).some(
        (element) => element.type === 'solid' || (element.type === 'cube' && element.overrides?.rounded === true),
      ),
  );

/** Manifold's geometry once loaded, for a document that needs it. */
export const useManifoldGeometry = (
  doc: Scene.SceneDocument,
  given: GeometrySource | undefined,
): GeometrySource | undefined => {
  const [geometry, setGeometry] = useState<GeometrySource>();
  const needed = !given && needsManifold(doc);
  useEffect(() => {
    if (!needed || geometry) {
      return;
    }
    let cancelled = false;
    void loadManifold().then((wasm) => !cancelled && setGeometry(() => manifoldGeometry(wasm)));
    return () => {
      cancelled = true;
    };
  }, [needed, geometry]);
  return given ?? geometry;
};

/** A renderer over the canvas, made again when the look changes, and the container's size as it resizes. */
/** Whether an event started on the scene's canvas, not on a panel or other overlay drawn over it. */
export const onScene = (event: Event): boolean => event.target instanceof HTMLCanvasElement;

export const useSceneRenderer = (
  containerRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  look: Theme3D,
): { renderer?: SceneRenderer3D; size: { width: number; height: number } } => {
  const [renderer, setRenderer] = useState<SceneRenderer3D>();
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const next = new SceneRenderer3D({
      canvas,
      theme: look,
      background: cssColorToHex(getComputedStyle(container).backgroundColor, '#f4f5f7'),
      selection: focusColor(container),
    });
    setRenderer(next);
    const observer = new ResizeObserver(([entry]) => {
      next.resize();
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      next.dispose();
      setRenderer(undefined);
    };
  }, [look]);
  // The focus colour follows the app's theme (light or dark), so it is read again as the view re-renders.
  useLayoutEffect(() => {
    const container = containerRef.current;
    container && renderer?.setSelectionColor(focusColor(container));
  });
  return { renderer, size };
};

/** The theme's focus colour, which the 2D canvas draws its selection frame in, as a hex string. */
const focusColor = (element: HTMLElement): string =>
  cssColorToHex(getComputedStyle(element).getPropertyValue('--color-focus').trim(), '#3b82f6');

export type OrbitOptions = {
  /** Off where something else drives the camera. */
  enabled: boolean;
  /** `all`: a left drag orbits too; `secondary`: only the middle button, while a tool owns the left. */
  buttons?: 'all' | 'secondary';
  onChange?: (camera: Scene.Camera3D) => void;
};

const sameCamera = (left: Scene.Camera3D, right: Scene.Camera3D): boolean =>
  left === right ||
  (left.yaw === right.yaw &&
    left.pitch === right.pitch &&
    left.distance === right.distance &&
    left.fov === right.fov &&
    left.projection === right.projection &&
    left.target.x === right.target.x &&
    left.target.y === right.target.y &&
    left.target.z === right.target.z);

/**
 * The camera shown: the orbit's, while `given` still has the value the orbit started from. A document re-read after
 * any edit makes a new camera object of the same value, which must not throw the orbit away.
 */
export const orbitView = (
  moved: { from: Scene.Camera3D; camera: Scene.Camera3D } | undefined,
  given: Scene.Camera3D,
  enabled: boolean,
): Scene.Camera3D => (enabled && moved && sameCamera(moved.from, given) ? moved.camera : given);

/**
 * The camera the pointer moves, starting from `given` and starting over whenever `given` changes value: a drag orbits,
 * a shift-drag pans; a trackpad pinch or a mouse wheel zooms, and a two-finger swipe orbits (Shift pans).
 */
export const useOrbit = (
  containerRef: RefObject<HTMLDivElement | null>,
  given: Scene.Camera3D,
  size: { width: number; height: number },
  { enabled, buttons = 'all', onChange }: OrbitOptions,
): Scene.Camera3D => {
  const [moved, setMoved] = useState<{ from: Scene.Camera3D; camera: Scene.Camera3D }>();
  const view = orbitView(moved, given, enabled);
  const givenRef = useRef(given);
  givenRef.current = given;
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) {
      return;
    }
    const move = (next: (camera: Scene.Camera3D) => Scene.Camera3D) => {
      const camera = next(viewRef.current);
      setMoved({ from: givenRef.current, camera });
      onChangeRef.current?.(camera);
    };
    let drag: { x: number; y: number; pan: boolean } | undefined;
    const onPointerDown = (event: PointerEvent) => {
      const gesture = onScene(event) ? orbitGesture(event, buttons) : undefined;
      if (!gesture) {
        return;
      }
      drag = { x: event.clientX, y: event.clientY, pan: gesture === 'pan' };
      container.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag) {
        return;
      }
      const delta = { x: event.clientX - drag.x, y: event.clientY - drag.y };
      const pan = drag.pan;
      drag = { ...drag, x: event.clientX, y: event.clientY };
      move((current) => (pan ? panBy(current, delta, sizeRef.current) : orbitBy(current, delta)));
    };
    const onPointerUp = () => {
      drag = undefined;
    };
    const onWheel = (event: WheelEvent) => {
      // A panel over the scene scrolls itself.
      if (!onScene(event)) {
        return;
      }
      // Not passive, so the page does not scroll under a zoom.
      event.preventDefault();
      const gesture = wheelGesture(event);
      move((current) =>
        gesture.kind === 'zoom'
          ? zoomBy(current, gesture.factor)
          : gesture.kind === 'pan'
            ? panBy(current, gesture.delta, sizeRef.current)
            : orbitBy(current, gesture.delta),
      );
    };
    const onContextMenu = (event: Event) => onScene(event) && event.preventDefault();
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('contextmenu', onContextMenu);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('contextmenu', onContextMenu);
    };
  }, [enabled, buttons]);
  return view;
};
