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
  const { update } = useViewStateActions(SlideViewState.aspect, contextId);
  // `nextCount` is for a caller that has just changed the deck, before this render's `count` catches up.
  const setIndex = useCallback(
    (next: number, nextCount = count) =>
      update((state) => ({ ...state, index: SlideViewState.clamp(next, nextCount) })),
    [update, count],
  );
  return [SlideViewState.clamp(index, count), setIndex];
};

/** The slide grid's thumbnail size for this viewer, persisted with their place in the deck. */
export const useGridSize = (
  contextId: string | undefined,
): [size: SlideViewState.GridSize, setSize: (size: SlideViewState.GridSize) => void] => {
  const { gridSize = 'small' } = useViewState(SlideViewState.aspect, contextId);
  const { update } = useViewStateActions(SlideViewState.aspect, contextId);
  const setSize = useCallback(
    (size: SlideViewState.GridSize) => update((state) => ({ ...state, gridSize: size })),
    [update],
  );
  return [gridSize, setSize];
};
