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
        (element) => element.kind === 'solid' || (element.kind === 'cube' && element.style?.rounded === true),
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
  return { renderer, size };
};

export type OrbitOptions = {
  /** Off where something else drives the camera. */
  enabled: boolean;
  /** `all`: a left drag orbits too; `secondary`: only the middle and right buttons, while a tool owns the left. */
  buttons?: 'all' | 'secondary';
  onChange?: (camera: Scene.Camera3D) => void;
};

/**
 * The camera the pointer moves, starting from `given` and starting over whenever `given` changes: a drag orbits,
 * a shift-drag or a right-drag pans, the wheel zooms.
 */
export const useOrbit = (
  containerRef: RefObject<HTMLDivElement | null>,
  given: Scene.Camera3D,
  size: { width: number; height: number },
  { enabled, buttons = 'all', onChange }: OrbitOptions,
): Scene.Camera3D => {
  const [moved, setMoved] = useState<{ from: Scene.Camera3D; camera: Scene.Camera3D }>();
  const view = enabled && moved?.from === given ? moved.camera : given;
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
      setMoved({ from: given, camera });
      onChangeRef.current?.(camera);
    };
    let drag: { x: number; y: number; pan: boolean } | undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (buttons === 'secondary' && event.button === 0) {
        return;
      }
      drag = { x: event.clientX, y: event.clientY, pan: event.shiftKey || event.button === 2 };
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
      // Not passive, so the page does not scroll under a zoom.
      event.preventDefault();
      move((current) => zoomBy(current, Math.exp(event.deltaY * 0.002)));
    };
    const onContextMenu = (event: Event) => event.preventDefault();
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
  }, [enabled, buttons, given]);
  return view;
};
