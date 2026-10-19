//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect } from 'react';

export type WheelHandler = (event: WheelEvent, pointer: { x: number; y: number }) => void;

/**
 * Marks content whose own scrolling takes the wheel rather than the canvas panning: a floating panel over the canvas
 * (the properties form), or a host's content embedded in a node (an object's surface in a frame).
 */
export const SCENE_OVERLAY_ATTRIBUTE = 'data-scene-overlay';

const SCROLLS = /(auto|scroll)/;

/** Whether an element from `target` up to `overlay` scrolls, so the wheel is its own rather than the canvas's. */
const scrollsWithin = (target: Element, overlay: Element): boolean => {
  for (let element: Element | null = target; element; element = element.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(element);
    if (
      (SCROLLS.test(overflowY) && element.scrollHeight > element.clientHeight) ||
      (SCROLLS.test(overflowX) && element.scrollWidth > element.clientWidth)
    ) {
      return true;
    }
    if (element === overlay) {
      return false;
    }
  }
  return false;
};

/**
 * Whether a wheel event comes from a trackpad (a two-finger scroll) rather than a mouse wheel, so a vertical swipe can
 * pan while a wheel notch zooms. Chromium and WebKit report a trackpad's legacy `wheelDeltaY` as exactly -3 times its
 * `deltaY` and a wheel's in 120-unit notches; Firefox, without the legacy field, reports a wheel in lines.
 */
export const isTrackpadScroll = (event: WheelEvent): boolean => {
  const legacy: unknown = Reflect.get(event, 'wheelDeltaY');
  if (typeof legacy === 'number' && legacy !== 0) {
    return legacy === -3 * event.deltaY;
  }
  return event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
};

/** Non-passive wheel listener with the pointer in element coordinates, so the page never scrolls. */
export const useWheel = (ref: RefObject<HTMLElement | null>, handler: WheelHandler) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const overlay = target?.closest(`[${SCENE_OVERLAY_ATTRIBUTE}]`);
      // Content embedded in a node with nothing to scroll (a card that fits its frame) still lets the canvas pan.
      if (target && overlay && (!overlay.closest('[data-node-id]') || scrollsWithin(target, overlay))) {
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
