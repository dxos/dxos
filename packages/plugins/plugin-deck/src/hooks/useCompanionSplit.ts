//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type SplitterOrientation } from '@dxos/react-ui';
import { ViewState, useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { COMPANION_VIEW_STATE_CONTEXT } from '../util';

/** Companion split point (rem) used until the user resizes a given orientation. */
export const DEFAULT_COMPANION_SIZE = 30;

/** Trailing delay before a resize is committed to storage (drags fire continuously). */
const PERSIST_DELAY = 250;

const CompanionSplitSchema = Schema.Struct({
  horizontal: Schema.optional(Schema.Number),
  vertical: Schema.optional(Schema.Number),
}).pipe(Schema.mutable);

export type CompanionSplit = Schema.Schema.Type<typeof CompanionSplitSchema>;

/**
 * Companion splitter sizes (rem), memoized separately for each orientation so toggling the companion
 * between side-by-side and stacked restores that orientation's last split point. Stored in the `local`
 * backend (localStorage, persisted across reloads) via react-ui-attention view state.
 */
export const companionSplitAspect: ViewState.Aspect<CompanionSplit> = ViewState.defineViewState<CompanionSplit>({
  key: 'deck-companion-split',
  backend: 'local',
  schema: CompanionSplitSchema,
  defaultValue: () => ({}),
});

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
  const split = useViewState(companionSplitAspect, COMPANION_VIEW_STATE_CONTEXT);
  const { update } = useViewStateActions(companionSplitAspect, COMPANION_VIEW_STATE_CONTEXT);
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
