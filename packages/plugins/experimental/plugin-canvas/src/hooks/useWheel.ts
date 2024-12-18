//
// Copyright 2024 DXOS.org
//

import { bind } from 'bind-event-listener';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

import { type TransformState } from './context';
import { getZoomTransform } from '../layout';

/**
 * Handle wheel events to update the transform state (zoom and offset).
 */
export const useWheel = (
  el: HTMLElement | null,
  width: number,
  height: number,
  setTransform: Dispatch<SetStateAction<TransformState>>,
) => {
  // TODO(burdon): Jumps when zooming and cursor falls out of node.

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

          // Keep centered.
          setTransform(({ scale, offset }) => {
            const scaleSensitivity = 0.01;
            const newScale = scale * Math.exp(-ev.deltaY * scaleSensitivity);
            const rect = el.getBoundingClientRect();
            const pos = { x: ev.offsetX - rect.left, y: ev.offsetY - rect.top };
            return getZoomTransform({ scale, offset, newScale, pos });
          });
        } else {
          setTransform(({ scale, offset: { x, y } }) => {
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
  }, [el, setTransform, width, height]);
};
