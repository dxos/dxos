//
// Copyright 2026 DXOS.org
//

import type { Registry } from '@effect-atom/atom-react';

import type { CellGridAtoms } from '../state/atoms';
import type { Cell, CellCoord, Headers, SelectionRange, Tool } from '../state/types';
import { cellKey, hitTestCell } from '../state/viewport';

export type PointerHandlers = {
  onCellToggle?: (coord: CellCoord) => void;
  onSelectionCommit?: (range: SelectionRange) => void;
};

type DragState =
  | { kind: 'toggle'; row: number; touched: Set<number> }
  | { kind: 'select'; origin: CellCoord }
  | { kind: 'pan'; lastX: number; lastY: number };

export type PointerControllerOptions<T> = {
  registry: Registry.Registry;
  atoms: CellGridAtoms<T>;
  headers: Headers;
  handlers: PointerHandlers;
};

/**
 * Attach pointer handlers to an element. Returns an unsubscribe.
 */
export const attachPointerHandlers = <T>(
  element: HTMLElement,
  { registry, atoms, headers, handlers }: PointerControllerOptions<T>,
): (() => void) => {
  let drag: DragState | null = null;

  const local = (event: PointerEvent) => {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent) => {
    // Middle-mouse or space-held pan: pan tool regardless of `tool` atom.
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      drag = { kind: 'pan', lastX: event.clientX, lastY: event.clientY };
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const viewport = registry.get(atoms.viewport);
    const point = local(event);
    const coord = hitTestCell(viewport, headers, point);
    if (!coord) {
      return;
    }

    const tool = registry.get(atoms.tool) as Tool;
    element.setPointerCapture(event.pointerId);

    switch (tool) {
      case 'toggle':
      case 'resize': {
        // Toggle on first cell; subsequent drag toggles additional cells in the same row.
        handlers.onCellToggle?.(coord);
        drag = { kind: 'toggle', row: coord.row, touched: new Set([coord.col]) };
        break;
      }
      case 'select': {
        drag = { kind: 'select', origin: coord };
        registry.set(atoms.selection, { range: { col0: coord.col, row0: coord.row, col1: coord.col, row1: coord.row } });
        break;
      }
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) {
      return;
    }
    if (drag.kind === 'pan') {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      registry.update(atoms.viewport, (current) => ({
        ...current,
        scrollX: Math.max(0, current.scrollX - dx),
        scrollY: Math.max(0, current.scrollY - dy),
      }));
      return;
    }

    const viewport = registry.get(atoms.viewport);
    const coord = hitTestCell(viewport, headers, local(event));
    if (!coord) {
      return;
    }

    if (drag.kind === 'toggle') {
      if (coord.row === drag.row && !drag.touched.has(coord.col)) {
        drag.touched.add(coord.col);
        handlers.onCellToggle?.(coord);
      }
    } else if (drag.kind === 'select') {
      registry.set(atoms.selection, {
        range: { col0: drag.origin.col, row0: drag.origin.row, col1: coord.col, row1: coord.row },
      });
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return;
    }
    if (drag.kind === 'select') {
      const range = registry.get(atoms.selection).range;
      if (range) {
        handlers.onSelectionCommit?.(range);
      }
    }
    drag = null;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
  };
};

/**
 * Utility for consumers: toggle membership of a cell in the cells atom.
 */
export const toggleCell = <T>(
  registry: Registry.Registry,
  atoms: CellGridAtoms<T>,
  coord: CellCoord,
  factory: (coord: CellCoord) => Cell<T>,
): void => {
  registry.update(atoms.cells, (current) => {
    const next = new Map(current);
    const key = cellKey(coord.col, coord.row);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, factory(coord));
    }
    return next;
  });
};
