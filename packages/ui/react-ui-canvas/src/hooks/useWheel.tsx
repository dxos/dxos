//
// Copyright 2024 DXOS.org
//

import { bindAll } from 'bind-event-listener';
import { useEffect } from 'react';

import { getRelativePoint } from '../util';

import { getZoomTransform } from './projection';
import { useCanvasContext } from './useCanvasContext';

export type WheelOptions = {
  zoom?: boolean;
};

const defaultOptions: WheelOptions = {
  zoom: true,
};

/**
 * Handle wheel events to update the transform state (zoom and offset).
 */
export const useWheel = (options: WheelOptions = defaultOptions) => {
  const { root, setProjection } = useCanvasContext();
  useEffect(() => {
    if (!root) {
      return;
    }

    return bindAll(root, [
      {
        type: 'wheel',
        options: { capture: true, passive: false },
        listener: (ev: WheelEvent) => {
          const zooming = isWheelZooming(ev);

          ev.preventDefault();
          if (zooming && !options.zoom) {
            return;
          }

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

const isWheelZooming = (ev: WheelEvent): boolean => {
  // Check for ctrl/cmd key + wheel action.
  if (ev.ctrlKey || ev.metaKey) {
    // Some browsers use deltaY, others deltaZ for zoom.
    return Math.abs(ev.deltaY) > 0 || Math.abs(ev.deltaZ) > 0;
  }

  return false;
};
