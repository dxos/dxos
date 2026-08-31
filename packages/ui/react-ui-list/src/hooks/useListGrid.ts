//
// Copyright 2026 DXOS.org
//

import { type CSSProperties, useMemo } from 'react';

export type UseListGridOptions = {
  /**
   * Number of inline action slots between title and expand caret. Each slot is sized to
   * `var(--dx-rail-item)` so an `IconButton` lands on the same baseline as the trailing icon.
   */
  actionSlots?: number;
  /** Reserve an expand-caret slot at the end of the title row. */
  expandable?: boolean;
  /** Reserve a trailing-action slot outside the row's card (e.g. delete). */
  trailing?: boolean;
};

export type UseListGridReturn = {
  /** Spread onto the outer row element to apply the grid template. */
  rowProps: { className: string; style: CSSProperties };
};

/**
 * Row layout aspect. Generates the CSS grid template that keeps drag handle, title,
 * inline actions, expand caret, and trailing icon co-aligned on the same line —
 * independent of whether the row body is expanded.
 *
 * Width tracks are `var(--dx-rail-item)` for icon-button slots and `1fr` for the
 * title, so every icon-shaped slot is the same width as `IconBlock` / `IconButton iconOnly`
 * and the line aligns without per-pixel adjustments.
 */
export const useListGrid = ({
  actionSlots = 0,
  expandable = false,
  trailing = false,
}: UseListGridOptions = {}): UseListGridReturn => {
  // Grid columns: [handle] [title=1fr] [action × N] [expand?] [trailing?]
  // `items-start` keeps trailing/handle anchored to the row top so they don't shift
  // when the title-row card grows vertically (e.g. on expand).
  const gridTemplateColumns = useMemo(() => {
    const tracks = ['var(--dx-rail-item)', '1fr'];
    for (let index = 0; index < actionSlots; index++) {
      tracks.push('var(--dx-rail-item)');
    }
    if (expandable) {
      tracks.push('var(--dx-rail-item)');
    }
    if (trailing) {
      tracks.push('var(--dx-rail-item)');
    }
    return tracks.join(' ');
  }, [actionSlots, expandable, trailing]);

  return {
    rowProps: {
      className: 'grid items-start gap-1',
      style: { gridTemplateColumns },
    },
  };
};
