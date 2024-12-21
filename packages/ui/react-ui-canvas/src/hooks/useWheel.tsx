//
// Copyright 2024 DXOS.org
//

import { bindAll } from 'bind-event-listener';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

import { getZoomTransform, type ProjectionState } from './projection';
import { getRelativePoint } from '../util';

/**
 * Handle wheel events to update the transform state (zoom and offset).
 */
export const useWheel = (el: HTMLDivElement | null, setProjection: Dispatch<SetStateAction<ProjectionState>>) => {
  useEffect(() => {
    if (!el) {
      return;
    }

    return bindAll(el, [
      {
        type: 'wheel',
        options: { capture: true, passive: false },
        listener: (ev: WheelEvent) => {
          ev.preventDefault();

          // Zoom or pan.
          if (ev.ctrlKey) {
            if (!el) {
              return;
            }

            // Keep centered while zooming.
            setProjection(({ scale, offset }) => {
              const pos = getRelativePoint(el, ev);
              const scaleSensitivity = 0.01;
              const newScale = scale * Math.exp(-ev.deltaY * scaleSensitivity);
              return getZoomTransform({ scale, offset, newScale, pos });
            });
          } else {
            setProjection(({ scale, offset: { x, y } }) => {
              return {
                scale,
                offset: {
                  x: x - ev.deltaX,
                  y: y - ev.deltaY,
                },
              };
            });
          }
        },
      },
    ]);
  }, [el, setProjection]);
};
