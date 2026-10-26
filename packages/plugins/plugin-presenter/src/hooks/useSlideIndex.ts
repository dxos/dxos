//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { SlideViewState } from '#types';

/** The viewer's current slide index (clamped to `count`) and a clamping setter. */
export const useSlideIndex = (
  contextId: string | undefined,
  count: number,
): [index: number, setIndex: (index: number, count?: number) => void] => {
  const { index } = useViewState(SlideViewState.aspect, contextId);
  const { set } = useViewStateActions(SlideViewState.aspect, contextId);
  // `nextCount` is for a caller that has just changed the deck, before this render's `count` catches up.
  const setIndex = useCallback(
    (next: number, nextCount = count) => set({ index: SlideViewState.clamp(next, nextCount) }),
    [set, count],
  );
  return [SlideViewState.clamp(index, count), setIndex];
};
