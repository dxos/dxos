//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { type SlideSource } from '#deck';

export type PresentedDeck = {
  /** The slides shown when presenting. */
  slides: SlideSource[];
  /** The current slide among them: the stored one, else the next shown after it. */
  index: number;
  /** Stores a presented slide's position in the whole deck. */
  onIndexChange: (index: number) => void;
};

/**
 * The deck as presented: only the slides at `positions` (hidden ones left out), with the index mapped both ways, so
 * the stored index stays a position in the whole deck, as the grid shows it. Positions rather than slides, since an
 * object linked twice yields two slides with one id.
 */
export const usePresentedIndex = (
  slides: SlideSource[],
  positions: readonly number[],
  index: number,
  setIndex: (index: number) => void,
): PresentedDeck => {
  const presented = useMemo(() => positions.flatMap((position) => slides[position] ?? []), [positions, slides]);
  const presentedIndex = useMemo(() => {
    const next = positions.findIndex((position) => position >= index);
    return next >= 0 ? next : positions.length - 1;
  }, [positions, index]);
  const onIndexChange = useCallback(
    (next: number) => {
      const position = positions[next];
      if (position !== undefined) {
        setIndex(position);
      }
    },
    [positions, setIndex],
  );
  return { slides: presented, index: presentedIndex, onIndexChange };
};
