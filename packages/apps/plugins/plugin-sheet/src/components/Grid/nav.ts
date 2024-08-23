//
// Copyright 2024 DXOS.org
//

import { type KeyboardEvent, type MouseEventHandler, useState } from 'react';

import { getCellAtPointer } from './Grid';
import { type CellAddress, type CellRange, posEquals } from '../../model';

export type GridBounds = {
  numRows: number;
  numColumns: number;
};

/**
 * Calculate next range based on arrow keys.
 */
export const handleNav = (
  ev: KeyboardEvent<HTMLInputElement>,
  cursor: CellAddress | undefined,
  range: CellRange | undefined,
  bounds: GridBounds,
): { cursor?: CellAddress; range?: CellRange } => {
  if (cursor && ev.shiftKey) {
    // Navigate from the furthest point.
    const opposite = range?.to ?? { ...cursor };
    switch (ev.key) {
      case 'ArrowUp': {
        if (opposite.row > 0) {
          opposite.row -= 1;
        }
        break;
      }
      case 'ArrowDown': {
        if (opposite.row < bounds.numRows - 1) {
          opposite.row += 1;
        }
        break;
      }
      case 'ArrowLeft': {
        if (opposite.column > 0) {
          opposite.column -= 1;
        }
        break;
      }
      case 'ArrowRight': {
        if (opposite.column < bounds.numColumns - 1) {
          opposite.column += 1;
        }
        break;
      }
    }

    return { cursor, range: { from: cursor, to: opposite } };
  }

  const next = handleArrowNav(ev, cursor, bounds);
  return { cursor: next };
};

/**
 * Calculate next cell based on arrow keys.
 */
export const handleArrowNav = (
  ev: Pick<KeyboardEvent<HTMLInputElement>, 'key' | 'metaKey'>,
  cursor: CellAddress | undefined,
  { numRows, numColumns }: GridBounds,
): CellAddress | undefined => {
  switch (ev.key) {
    case 'ArrowUp':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.row > 0) {
        return { row: ev.metaKey ? 0 : cursor.row - 1, column: cursor.column };
      }
      break;
    case 'ArrowDown':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.row < numRows - 1) {
        return { row: ev.metaKey ? numRows - 1 : cursor.row + 1, column: cursor.column };
      }
      break;
    case 'ArrowLeft':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.column > 0) {
        return { row: cursor.row, column: ev.metaKey ? 0 : cursor.column - 1 };
      }
      break;
    case 'ArrowRight':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.column < numColumns - 1) {
        return { row: cursor.row, column: ev.metaKey ? numColumns - 1 : cursor.column + 1 };
      }
      break;
    case 'Home':
      return { row: 0, column: 0 };
    case 'End':
      return { row: numRows - 1, column: numColumns - 1 };
  }
};

/**
 * Hook to manage range drag handlers.
 */
export const useRangeSelect = (
  cb: (event: 'start' | 'move' | 'end', range: CellRange | undefined) => void,
): {
  range: CellRange | undefined;
  handlers: {
    onMouseDown: MouseEventHandler<HTMLDivElement>;
    onMouseMove: MouseEventHandler<HTMLDivElement>;
    onMouseUp: MouseEventHandler<HTMLDivElement>;
  };
} => {
  const [from, setFrom] = useState<CellAddress | undefined>();
  const [to, setTo] = useState<CellAddress | undefined>();

  // TODO(burdon): Memoize callbacks?

  const onMouseDown: MouseEventHandler<HTMLDivElement> = (ev) => {
    const current = getCellAtPointer(ev);
    setFrom(current);
    if (current) {
      setTimeout(() => cb('start', { from: current }));
    }
  };

  const onMouseMove: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (from) {
      let current = getCellAtPointer(ev);
      if (posEquals(current, from)) {
        current = undefined;
      }
      setTo(current);
      setTimeout(() => cb('move', { from, to: current }));
    }
  };

  const onMouseUp: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (from) {
      let current = getCellAtPointer(ev);
      if (posEquals(current, from)) {
        current = undefined;
      }
      setFrom(undefined);
      setTo(undefined);
      setTimeout(() => cb('end', current ? { from, to: current } : undefined));
    }
  };

  return {
    range: from ? { from, to } : undefined,
    handlers: { onMouseDown, onMouseMove, onMouseUp },
  };
};
