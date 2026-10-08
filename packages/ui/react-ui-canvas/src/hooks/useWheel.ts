//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect } from 'react';

export type WheelHandler = (event: WheelEvent, pointer: { x: number; y: number }) => void;

/**
 * Marks a floating panel over the canvas (the properties form) whose own content scrolls: a wheel there
 * scrolls the panel rather than panning the canvas.
 */
export const SCENE_OVERLAY_ATTRIBUTE = 'data-scene-overlay';

/** Non-passive wheel listener with the pointer in element coordinates, so the page never scrolls. */
export const useWheel = (ref: RefObject<HTMLElement | null>, handler: WheelHandler) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const overlay = event.target instanceof Element && event.target.closest(`[${SCENE_OVERLAY_ATTRIBUTE}]`);
      if (overlay) {
        // A pinch over a panel still must not zoom the page; a scroll is the panel's own.
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
        }
        return;
      }
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      handler(event, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [ref, handler]);
};
