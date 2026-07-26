//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type SplitterOrientation } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { COMPANION_VIEW_STATE_CONTEXT, companionAspect } from '../util';

/** Companion split point (rem) used until the user resizes a given orientation. */
export const DEFAULT_COMPANION_SIZE = 30;

/** Trailing delay before a resize is committed to storage (drags fire continuously). */
const PERSIST_DELAY = 250;

export type UseCompanionSplit = {
  /** The remembered split point for the current orientation (or the default). */
  size: number;
  onSizeChange: (size: number) => void;
};

/**
 * Reads and writes the global companion splitter size keyed by `orientation`. A live size keeps dragging
 * smooth while the persisted write is debounced (and flushed on unmount) to avoid per-frame storage writes.
 */
export const useCompanionSplit = (orientation: SplitterOrientation): UseCompanionSplit => {
  const split = useViewState(companionAspect, COMPANION_VIEW_STATE_CONTEXT);
  const { update } = useViewStateActions(companionAspect, COMPANION_VIEW_STATE_CONTEXT);
  const storedSize = split[orientation] ?? DEFAULT_COMPANION_SIZE;

  // Drive the controlled Splitter from local state so a drag tracks the pointer without a storage
  // round-trip per frame; reseed when the orientation switches (recall) or storage changes externally.
  const [liveSize, setLiveSize] = useState(storedSize);
  useEffect(() => setLiveSize(storedSize), [storedSize, orientation]);

  // Flush the trailing write on unmount so the final size is not dropped inside the debounce window.
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; flush: () => void } | undefined>(undefined);
  useEffect(() => () => pending.current?.flush(), []);

  const onSizeChange = useCallback(
    (next: number) => {
      setLiveSize(next);
      if (pending.current) {
        clearTimeout(pending.current.timer);
      }
      const flush = () => {
        pending.current = undefined;
        update((prev) => ({ ...prev, [orientation]: next }));
      };
      pending.current = { timer: setTimeout(flush, PERSIST_DELAY), flush };
    },
    [update, orientation],
  );

  return useMemo(() => ({ size: liveSize, onSizeChange }), [liveSize, onSizeChange]);
};
