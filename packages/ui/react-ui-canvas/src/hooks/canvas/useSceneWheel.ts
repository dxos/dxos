//
// Copyright 2026 DXOS.org
//

import { type MutableRefObject, type RefObject, useCallback } from 'react';

import { panBy, zoomAt } from '../../utils/index.ts';
import { isTrackpadScroll } from '../../utils/index.ts';
import { useWheel } from '../useWheel.ts';
import { type SceneCamera } from './useSceneCamera.ts';

export type UseSceneWheelOptions = {
  rootRef: RefObject<HTMLDivElement | null>;
  /** Set once the user takes the camera over, which stops the view re-fitting itself. */
  interactedRef: MutableRefObject<boolean>;
  exitFit: () => void;
} & Pick<SceneCamera, 'setCamera' | 'cancelAnimation' | 'touchNavigation'>;

/** The wheel and the trackpad move the camera: a pinch or a mouse wheel zooms about the pointer, a swipe pans. */
export const useSceneWheel = ({
  rootRef,
  interactedRef,
  exitFit,
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
      [setCamera, cancelAnimation, touchNavigation, exitFit],
    ),
  );
};
