//
// Copyright 2026 DXOS.org
//

import type { Registry } from '@effect-atom/atom-react';

import type { CellGridAtoms } from '../state/atoms';
import type { Cell, CellCoord, Headers, SelectionRange, Tool } from '../state/types';
import { cellKey, hitTestCell } from '../state/viewport';

/**
 * 'set' / 'unset' are idempotent — the receiver must add or remove the cell
 * regardless of current state. 'toggle' flips it. Drag operations always pick
 * a fixed mode (set or unset) based on the cell under the initial pointerdown
 * so the user paints a uniform stroke instead of flipping each cell.
 */
export type ToggleMode = 'set' | 'unset' | 'toggle';

export type PointerHandlers = {
  onCellToggle?: (coord: CellCoord, mode: ToggleMode) => void;
  onSelectionCommit?: (range: SelectionRange) => void;
  /** Called each time the draw cursor moves to a new cell (edit tool). */
  onDrawUpdate?: (startCoord: CellCoord, endCoord: CellCoord) => void;
  /** Called when the user releases after an edit-tool drag; caller commits the note. */
  onDrawCommit?: (startCoord: CellCoord, endCoord: CellCoord) => void;
};

type DragState =
  | { kind: 'toggle'; mode: 'set' | 'unset'; touched: Set<string> }
  | { kind: 'draw'; startCoord: CellCoord; endCoord: CellCoord }
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

  // setPointerCapture throws for synthetic / untrusted PointerEvents (e.g. those
  // dispatched by tests). Capture is a best-effort UX nicety — never let it abort
  // the click path.
  const tryCapture = (pointerId: number) => {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Ignore — drag tracking still works without capture.
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    // Middle-mouse or space-held pan: pan tool regardless of `tool` atom.
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      drag = { kind: 'pan', lastX: event.clientX, lastY: event.clientY };
      tryCapture(event.pointerId);
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
    tryCapture(event.pointerId);

    switch (tool) {
      case 'toggle':
      case 'resize': {
        // Inspect the cells atom under the pointer to decide whether the gesture
        // is a paint (set) or an erase (unset). Subsequent drag movements apply the
        // same operation idempotently to every cell the cursor crosses.
        const cells = registry.get(atoms.cells) as ReadonlyMap<string, unknown>;
        const key = cellKey(coord.col, coord.row);
        const mode: 'set' | 'unset' = cells.has(key) ? 'unset' : 'set';
        handlers.onCellToggle?.(coord, mode);
        drag = { kind: 'toggle', mode, touched: new Set([key]) };
        break;
      }
      case 'edit': {
        // Start a draw gesture: track extent and fire preview/commit callbacks
        // instead of toggling individual cells. Constrained to the starting row.
        drag = { kind: 'draw', startCoord: coord, endCoord: coord };
        handlers.onDrawUpdate?.(coord, coord);
        break;
      }
      case 'delete': {
        // Always removes notes regardless of current cell state.
        const key = cellKey(coord.col, coord.row);
        handlers.onCellToggle?.(coord, 'unset');
        drag = { kind: 'toggle', mode: 'unset', touched: new Set([key]) };
        break;
      }
      case 'select': {
        drag = { kind: 'select', origin: coord };
        registry.set(atoms.selection, {
          range: { col0: coord.col, row0: coord.row, col1: coord.col, row1: coord.row },
        });
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
      // Apply the drag's chosen mode to every cell the cursor enters, across rows,
      // de-duplicating per cell so we don't fire the same coord twice.
      const key = cellKey(coord.col, coord.row);
      if (!drag.touched.has(key)) {
        drag.touched.add(key);
        handlers.onCellToggle?.(coord, drag.mode);
      }
    } else if (drag.kind === 'draw') {
      // Constrain to the starting row so the note stays at the same pitch.
      const constrainedCol = coord.col;
      if (constrainedCol !== drag.endCoord.col) {
        drag.endCoord = { col: constrainedCol, row: drag.startCoord.row };
        handlers.onDrawUpdate?.(drag.startCoord, drag.endCoord);
      }
    } else if (drag.kind === 'select') {
      registry.set(atoms.selection, {
        range: { col0: drag.origin.col, row0: drag.origin.row, col1: coord.col, row1: coord.row },
      });
    }
  };

  const releaseCapture = (event: PointerEvent) => {
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return;
    }
    if (drag.kind === 'draw') {
      handlers.onDrawCommit?.(drag.startCoord, drag.endCoord);
    } else if (drag.kind === 'select') {
      const range = registry.get(atoms.selection).range;
      if (range) {
        handlers.onSelectionCommit?.(range);
      }
    }
    drag = null;
    releaseCapture(event);
  };

  // pointercancel signals an interrupted gesture (system gesture, palm rejection,
  // capture lost). Per the Pointer Events spec this should clean up local state
  // ONLY and not be treated as a successful completion — so we never commit a
  // selection from cancel.
  const onPointerCancel = (event: PointerEvent) => {
    drag = null;
    releaseCapture(event);
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerCancel);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerCancel);
  };
};

/**
 * Utility for consumers: toggle, set, or unset membership of a cell in the cells atom.
 */
export const toggleCell = <T>(
  registry: Registry.Registry,
  atoms: CellGridAtoms<T>,
  coord: CellCoord,
  factory: (coord: CellCoord) => Cell<T>,
  mode: ToggleMode = 'toggle',
): void => {
  registry.update(atoms.cells, (current) => {
    const next = new Map(current);
    const key = cellKey(coord.col, coord.row);
    const exists = next.has(key);
    if (mode === 'set' || (mode === 'toggle' && !exists)) {
      next.set(key, factory(coord));
    } else if (mode === 'unset' || (mode === 'toggle' && exists)) {
      next.delete(key);
    }
    return next;
  });
};
