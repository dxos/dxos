//
// Copyright 2024 DXOS.org
//

import { bind } from 'bind-event-listener';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

import { getZoomTransform, type ProjectionState } from './projection';

/**
 * Handle wheel events to update the transform state (zoom and offset).
 */
export const useWheel = (el: HTMLDivElement | null, setProjection: Dispatch<SetStateAction<ProjectionState>>) => {
  useEffect(() => {
    if (!el) {
      return;
    }

    return bind(el, {
      type: 'wheel',
      listener: (ev: WheelEvent) => {
        ev.preventDefault();

        // Zoom or pan.
        if (ev.ctrlKey) {
          if (!el) {
            return;
          }

          // Keep centered while zooming.
          setProjection(({ scale, offset }) => {
            const scaleSensitivity = 0.01;
            const newScale = scale * Math.exp(-ev.deltaY * scaleSensitivity);
            const rect = el.getBoundingClientRect();
            const pos = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
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
    });
  }, [el, setProjection]);
};
