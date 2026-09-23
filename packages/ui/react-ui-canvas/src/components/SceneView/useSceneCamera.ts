//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { type useRegistry } from '../../hooks/index.ts';
import { type SceneViewAtoms } from '../../model/atoms.ts';
import { type Camera, type ElementId, type Size } from '../../model/types.ts';
import { animateCamera } from '../../utils/camera.ts';

/** Quiet time after the last wheel step before the canvas takes pointer events again. */
const NAVIGATION_SETTLE_MS = 150;

export type SceneCamera = {
  /** Write the camera, from a value or from its predecessor. */
  setCamera: (next: Camera | ((camera: Camera) => Camera)) => void;
  /** Animate to `target`, calling `done` when the last frame lands. */
  animateTo: (target: Camera, done?: () => void) => void;
  /** Abandon an animation in flight, leaving the camera where it reached. */
  cancelAnimation: () => void;
  /** The camera is moving on its own, so the canvas ignores the pointer. */
  navigating: boolean;
  /** The same, read at call time: a handler closes over the render's value, which is a frame behind. */
  isNavigating: () => boolean;
  /** Whether an animation is in flight, read at call time for the same reason. */
  isAnimating: () => boolean;
  setNavigation: (active: boolean) => void;
  /** Navigation that ends on its own: active until no further step arrives for a beat. */
  touchNavigation: () => void;
  /** The portal a drill-in is zooming into, while it is. */
  opening: ElementId | undefined;
  setOpening: (id: ElementId | undefined) => void;
};

/**
 * The camera and the animations that move it. While the camera moves on its own — a wheel zoom, a pan,
 * a drill-in — the canvas ignores the pointer: nothing under it is where it will be, so hover and
 * presses would land on passing content.
 */
export const useSceneCamera = (
  registry: ReturnType<typeof useRegistry>,
  atoms: SceneViewAtoms,
  viewport: Size,
): SceneCamera => {
  const setCamera = useCallback(
    (next: Camera | ((camera: Camera) => Camera)) => {
      registry.set(atoms.camera, typeof next === 'function' ? next(registry.get(atoms.camera)) : next);
    },
    [registry, atoms.camera],
  );

  // Cleared as well as called: a cancelled frame never runs the completion callback that would.
  const cancelRef = useRef<() => void>(undefined);
  const [opening, setOpening] = useState<ElementId>();
  const [navigating, setNavigating] = useState(false);
  const navigatingRef = useRef(false);
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setNavigation = useCallback(
    (active: boolean) => {
      clearTimeout(settleRef.current);
      settleRef.current = undefined;
      if (navigatingRef.current !== active) {
        navigatingRef.current = active;
        setNavigating(active);
        if (active) {
          registry.set(atoms.hover, undefined);
        }
      }
    },
    [registry, atoms.hover],
  );

  const touchNavigation = useCallback(() => {
    setNavigation(true);
    settleRef.current = setTimeout(() => setNavigation(false), NAVIGATION_SETTLE_MS);
  }, [setNavigation]);
  useEffect(() => () => clearTimeout(settleRef.current), []);

  const cancelAnimation = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = undefined;
      setNavigation(false);
    }
    setOpening(undefined);
  }, [setNavigation]);

  const animateTo = useCallback(
    (target: Camera, done?: () => void) => {
      cancelAnimation();
      setNavigation(true);
      cancelRef.current = animateCamera(registry.get(atoms.camera), target, viewport, setCamera, () => {
        cancelRef.current = undefined;
        setNavigation(false);
        done?.();
      });
    },
    [registry, atoms.camera, viewport, setCamera, cancelAnimation, setNavigation],
  );

  const isNavigating = useCallback(() => navigatingRef.current, []);
  const isAnimating = useCallback(() => cancelRef.current !== undefined, []);

  return {
    setCamera,
    animateTo,
    cancelAnimation,
    navigating,
    isNavigating,
    isAnimating,
    setNavigation,
    touchNavigation,
    opening,
    setOpening,
  };
};
