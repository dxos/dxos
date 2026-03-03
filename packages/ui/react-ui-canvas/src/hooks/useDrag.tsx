//
// Copyright 2024 DXOS.org
//

import { bind } from 'bind-event-listener';
import { useEffect, useRef } from 'react';

import { useCanvasContext } from './useCanvasContext';

export type DragOptions = {
  // TODO(burdon): Add constraints?
};

/**
 * Handle drag events to update the transform state (offset).
 */
export const useDrag = (_options: DragOptions = {}) => {
  const { root, setProjection } = useCanvasContext();

  // Track drag state.
  const state = useRef<{
    panning: boolean;
    x: number;
    y: number;
  }>({ panning: false, x: 0, y: 0 });

  useEffect(() => {
    if (!root) {
      return;
    }

    // TODO(burdon): Use d3-drag?
    return bind(root, {
      type: 'pointerdown',
      listener: (ev: PointerEvent) => {
        // Only left click.
        if (ev.button !== 0) {
          return;
        }

        if (ev.defaultPrevented) {
          return;
        }

        if (ev.target !== root || ev.shiftKey) {
          return;
        }

        // Check if clicking on an interactive element?
        // For now, assume if it bubbled to root, it's fair game unless prevented.

        ev.preventDefault(); // Prevent text selection.
        root.setPointerCapture(ev.pointerId);
        state.current = { panning: true, x: ev.clientX, y: ev.clientY };

        const moveUnbind = bind(root, {
          type: 'pointermove',
          listener: (ev: PointerEvent) => {
            if (!state.current.panning) {
              return;
            }

            // Calculate delta.
            const dx = ev.clientX - state.current.x;
            const dy = ev.clientY - state.current.y;

            state.current.x = ev.clientX;
            state.current.y = ev.clientY;

            setProjection((prev) => ({
              ...prev,
              offset: {
                x: prev.offset.x + dx,
                y: prev.offset.y + dy,
              },
            }));
          },
        });

        const upUnbind = bind(root, {
          type: 'pointerup',
          listener: (ev: PointerEvent) => {
            state.current.panning = false;
            root.releasePointerCapture(ev.pointerId);
            moveUnbind();
            upUnbind();
            // Clean up lostpointercapture as well?
          },
        });

        // Handle cancellation/lost capture just in case?
        // Using setPointerCapture usually handles this well on the element.
      },
    });
  }, [root]);
};
