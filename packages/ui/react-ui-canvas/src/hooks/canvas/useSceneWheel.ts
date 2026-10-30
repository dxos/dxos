//
// Copyright 2026 DXOS.org
//

import { type MutableRefObject, type RefObject, useCallback } from 'react';

import { type CanvasAtoms } from '../../engine/index.ts';
import { panBy, zoomAt } from '../../utils/index.ts';
import { isTrackpadScroll } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { useWheel } from '../useWheel.ts';
import { type SceneCamera } from './useSceneCamera.ts';

export type UseSceneWheelOptions = {
  rootRef: RefObject<HTMLDivElement | null>;
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  /** Set once the user takes the camera over, which stops the view re-fitting itself. */
  interactedRef: MutableRefObject<boolean>;
  exitFit: () => void;
  /** A camera track drives the camera, which a wheel the user turns stops. */
  hasCameraTrack: boolean;
} & Pick<SceneCamera, 'setCamera' | 'cancelAnimation' | 'touchNavigation'>;

/** The wheel and the trackpad move the camera: a pinch or a mouse wheel zooms about the pointer, a swipe pans. */
export const useSceneWheel = ({
  rootRef,
  registry,
  atoms,
  interactedRef,
  exitFit,
  hasCameraTrack,
  setCamera,
  cancelAnimation,
  touchNavigation,
}: UseSceneWheelOptions) => {
  useWheel(
    rootRef,
    useCallback(
      (event, pointer) => {
        interactedRef.current = true;
        exitFit();
        cancelAnimation();
        touchNavigation();
        // A camera the user moves during playback stops the camera track driving it.
        if (hasCameraTrack) {
          registry.set(atoms.clock.playing, false);
        }
        if (event.ctrlKey || event.metaKey) {
          // A trackpad pinch: small deltas, so a steeper rate.
          setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.006)));
        } else if (event.shiftKey || isTrackpadScroll(event)) {
          // A two-finger swipe pans both ways, as on any trackpad canvas.
          setCamera((camera) => panBy(camera, { x: -event.deltaX / camera.zoom, y: -event.deltaY / camera.zoom }));
        } else {
          // Mouse-wheel notches up and down zoom about the pointer; a sideways scroll still pans.
          setCamera((camera) =>
            zoomAt(
              panBy(camera, { x: -event.deltaX / camera.zoom, y: 0 }),
              pointer,
              camera.zoom * Math.exp(-event.deltaY * 0.001),
            ),
          );
        }
      },
      [setCamera, cancelAnimation, touchNavigation, exitFit, hasCameraTrack, registry, atoms.clock],
    ),
  );
};
