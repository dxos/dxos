//
// Copyright 2026 DXOS.org
//

import { type Virtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { type PositionKey } from './position-log';

/** Movement below this is rounding, and correcting for it would fight the browser's own. */
const EPSILON = 0.5;

export type ScrollAnchorOptions = {
  viewport: HTMLElement | null;
  virtualizer: Virtualizer<HTMLElement, HTMLElement>;
  /** Suspend while the feed is pinned to its tail: there the bottom is the anchor, not a row. */
  disabled?: boolean;
};

/**
 * Holds the row the reader is looking at still while the layout is corrected underneath it.
 *
 * A virtualized list of variable-height rows cannot know a row's height until it has rendered it, so
 * every row entering the window for the first time corrects the layout — and the correction moves
 * the offset of that row and everything after it. Scrolling down this is invisible, because the rows
 * above have already been measured. Scrolling **up**, rows are measured for the first time exactly
 * as they enter, and the whole window jumps by the size of the correction.
 *
 * The cure is to make the correction relative: pick the topmost visible row as an anchor, and after
 * each layout move `scrollTop` by however far that row's offset moved. The anchor lands on the same
 * pixel, so the reader sees nothing.
 *
 * The virtualizer's own compensation (`shouldAdjustScrollPositionOnItemSizeChange`) tries the same
 * thing from the other end — it fires per resize, against a scroll offset that trails the element's
 * real one — and measurably makes this worse when forced on. This runs once per layout, against the
 * offsets that layout actually used.
 */
export const useScrollAnchor = ({ viewport, virtualizer, disabled }: ScrollAnchorOptions) => {
  const anchor = useRef<{ key: PositionKey; start: number; index: number } | null>(null);
  const adjusting = useRef(false);

  // The reader moving is what decides which row should stay put next, so their scroll drops the old
  // anchor; ours does not, or the correction would erase its own reference point.
  useEffect(() => {
    if (!viewport) {
      return;
    }

    const onScroll = () => {
      if (adjusting.current) {
        adjusting.current = false;
        return;
      }

      anchor.current = null;
    };

    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [viewport]);

  // Deliberately every render, and before paint: a correction that lands after the frame is drawn is
  // the flicker itself.
  useLayoutEffect(() => {
    if (!viewport || disabled) {
      return;
    }

    const items = virtualizer.getVirtualItems();
    if (!items.length) {
      return;
    }

    const held = anchor.current;
    if (held) {
      const item = items.find(({ key }) => key === held.key);
      if (item) {
        const delta = item.start - held.start;
        if (Math.abs(delta) > EPSILON) {
          adjusting.current = true;
          viewport.scrollTop += delta;
        }

        anchor.current = { key: item.key, start: item.start, index: item.index };
        return;
      }
    }

    // Topmost row still on screen: the one whose displacement the reader would notice first.
    const offset = viewport.scrollTop;
    const item = items.find(({ start, size }) => start + size > offset) ?? items[0];
    anchor.current = { key: item.key, start: item.start, index: item.index };
  });
};
