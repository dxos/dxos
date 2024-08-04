//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { getCellBounds } from './Cell';
import { useSheetContext } from './context';
import { getBounds } from './util';

/**
 * Selection range.
 */
export const Overlay = ({ grid }: { grid: HTMLElement }) => {
  const { editing, selected } = useSheetContext();
  if (editing || !selected?.from) {
    return null;
  }

  // TODO(burdon): Bug: Bounds are incorrect after scrolling.
  const fromBounds = getCellBounds(grid, selected.from);
  if (!fromBounds) {
    return null;
  }

  // TODO(burdon): May not be rendered (off view port, in which case find the closest cell).
  let rangeBounds;
  if (selected.to) {
    const toBounds = getCellBounds(grid, selected.to);
    if (toBounds) {
      rangeBounds = getBounds(fromBounds, toBounds);
    }
  }

  return (
    <>
      <div
        className={mx('z-[10] absolute border border-black dark:border-white opacity-50', 'pointer-events-none')}
        style={fromBounds}
      />
      {rangeBounds && (
        <div
          className={mx(
            'z-[10] absolute border bg-neutral-900 dark:bg-neutral-100 border-black dark:border-white opacity-10',
            'pointer-events-none',
          )}
          style={rangeBounds}
        />
      )}
    </>
  );
};
