//
// Copyright 2026 DXOS.org
//

import type { Registry } from '@effect-atom/atom-react';

import type { CellGridAtoms } from '../state/atoms';
import type { Headers } from '../state/types';
import { cellWidth } from '../state/viewport';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

export type WheelControllerOptions<T> = {
  registry: Registry.Registry;
  atoms: CellGridAtoms<T>;
  headers: Headers;
};

/**
 * Attach wheel handlers. Vertical wheel scrolls y; shift+wheel scrolls x;
 * cmd/ctrl+wheel zooms x around the cursor.
 */
export const attachWheelHandlers = <T>(
  element: HTMLElement,
  { registry, atoms, headers }: WheelControllerOptions<T>,
): (() => void) => {
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      // Zoom around cursor x.
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const factor = Math.exp(-event.deltaY / 200);
      registry.update(atoms.viewport, (current) => {
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoomX * factor));
        if (nextZoom === current.zoomX) {
          return current;
        }
        const w = cellWidth(current);
        const worldX = (x - headers.left + current.scrollX) / w;
        const nextW = current.baseCellWidth * nextZoom;
        const nextScrollX = Math.max(0, worldX * nextW - (x - headers.left));
        return { ...current, zoomX: nextZoom, scrollX: nextScrollX };
      });
      return;
    }

    const dx = event.shiftKey ? event.deltaY : event.deltaX;
    const dy = event.shiftKey ? 0 : event.deltaY;
    const current = registry.get(atoms.viewport);
    const nextScrollX = Math.max(0, current.scrollX + dx);
    const nextScrollY = Math.max(0, current.scrollY + dy);

    // Only consume the wheel event if we're actually scrolling within the grid.
    // When the user wheels up at the top (scrollY === 0 && dy < 0) or wheels left
    // at the left edge, let the event bubble to the parent so the page or
    // enclosing container can scroll instead of swallowing the gesture.
    if (nextScrollX === current.scrollX && nextScrollY === current.scrollY) {
      return;
    }
    event.preventDefault();
    registry.set(atoms.viewport, { ...current, scrollX: nextScrollX, scrollY: nextScrollY });
  };

  element.addEventListener('wheel', onWheel, { passive: false });
  return () => element.removeEventListener('wheel', onWheel);
};
