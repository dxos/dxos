//
// Copyright 2024 DXOS.org
//

import { bindAll } from 'bind-event-listener';
import { useEffect } from 'react';

import { getZoomTransform } from './projection';
import { useProjection } from './useProjection';
import { getRelativePoint } from '../util';

/**
 * Handle wheel events to update the transform state (zoom and offset).
 */
export const useWheel = () => {
  const { root, setProjection } = useProjection();
  useEffect(() => {
    if (!root) {
      return;
    }

    return bindAll(root, [
      {
        type: 'wheel',
        options: { capture: true, passive: false },
        listener: (ev: WheelEvent) => {
          ev.preventDefault();

          // Zoom or pan.
          if (ev.ctrlKey) {
            if (!root) {
              return;
            }

            // Keep centered while zooming.
            setProjection(({ scale, offset }) => {
              const pos = getRelativePoint(root, ev);
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
  }, [root]);
};
