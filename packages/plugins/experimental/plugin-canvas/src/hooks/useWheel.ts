//
// Copyright 2024 DXOS.org
//

import { bind } from 'bind-event-listener';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

import { invariant } from '@dxos/invariant';

import { type TransformState } from './context';

/**
 * Handle wheel events to update the transform state (zoom and offset).
 */
export const useWheel = (
  el: HTMLElement | null,
  width: number,
  height: number,
  setTransform: Dispatch<SetStateAction<TransformState>>,
) => {
  useEffect(() => {
    if (!el) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Zoom or pan.
      if (event.ctrlKey) {
        if (!el) {
          return;
        }

        // Keep centered.
        setTransform(({ scale, offset }) => {
          const scaleSensitivity = 0.01;
          const newScale = scale * Math.exp(-event.deltaY * scaleSensitivity);
          invariant(el);
          const rect = el.getBoundingClientRect();
          const pos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          const newOffset = {
            x: pos.x - (pos.x - offset.x) * (newScale / scale),
            y: pos.y - (pos.y - offset.y) * (newScale / scale),
          };

          return { scale: newScale, offset: newOffset };
        });
      } else {
        setTransform(({ scale, offset: { x, y } }) => ({
          scale,
          offset: { x: x - event.deltaX, y: y - event.deltaY },
        }));
      }
    };

    return bind(el, { type: 'wheel', listener: handleWheel });
  }, [el, setTransform, width, height]);
};
