//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import {
  type DateTimePickerMode,
  type DateTimePickerRootProps,
  type ValueFor,
  isRangeMode,
} from './types';
import { coerceValue, defaultValueFor } from './util';

export type RangeEndpoint = 'from' | 'to';

export type DateTimePickerState<M extends DateTimePickerMode = DateTimePickerMode> = {
  mode: M;
  /** Currently committed value (what callers observe). */
  committed: ValueFor<M>;
  /** In-popover draft value (may differ from `committed` until commit/cancel). */
  draft: ValueFor<M>;
  setDraft: (next: ValueFor<M>) => void;
  /** For range modes: which endpoint the popover is currently editing. */
  endpoint: RangeEndpoint;
  setEndpoint: (endpoint: RangeEndpoint) => void;
  /** Commit the draft to `committed` and fire `onValueChange`. */
  commit: () => void;
  /** Drop the draft (reset it to `committed`). */
  cancelDraft: () => void;
  /** Open state of the popover. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Write a committed value directly (used by trigger segment edits). */
  setCommitted: (next: ValueFor<M>) => void;
};

/** Internal state hook for `DateTimePicker.Root`. Implements the controlled+uncontrolled pattern. */
export const useDateTimePicker = <M extends DateTimePickerMode>(
  props: DateTimePickerRootProps<M>,
): DateTimePickerState<M> => {
  const { mode, value, defaultValue, onValueChange, open: openProp, defaultOpen, onOpenChange } = props;

  // Committed value: controlled if `value` provided, else internal.
  const [internalValue, setInternalValue] = useState<ValueFor<M>>(() =>
    coerceValue(mode, defaultValue ?? defaultValueFor(mode)),
  );
  const committed = value !== undefined ? coerceValue(mode, value) : internalValue;

  const setCommitted = useCallback(
    (next: ValueFor<M>) => {
      const coerced = coerceValue(mode, next);
      if (value === undefined) {
        setInternalValue(coerced);
      }
      onValueChange?.(coerced);
    },
    [mode, value, onValueChange],
  );

  // Draft value: always internal; re-seeded from committed when popover opens.
  const [draft, setDraftInternal] = useState<ValueFor<M>>(committed);
  const [endpoint, setEndpoint] = useState<RangeEndpoint>('from');

  const setDraft = useCallback((next: ValueFor<M>) => {
    setDraftInternal(next);
  }, []);

  const commit = useCallback(() => {
    setCommitted(draft);
  }, [draft, setCommitted]);

  const cancelDraft = useCallback(() => {
    setDraftInternal(committed);
  }, [committed]);

  // Open state: controlled if `open` provided, else internal.
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const open = openProp !== undefined ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        // Re-seed draft from committed each time we open.
        setDraftInternal(committed);
        if (isRangeMode(mode)) {
          setEndpoint('from');
        }
      }
      if (openProp === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [committed, mode, openProp, onOpenChange],
  );

  return useMemo<DateTimePickerState<M>>(
    () => ({
      mode,
      committed,
      draft,
      setDraft,
      endpoint,
      setEndpoint,
      commit,
      cancelDraft,
      open,
      setOpen,
      setCommitted,
    }),
    [mode, committed, draft, setDraft, endpoint, commit, cancelDraft, open, setOpen, setCommitted],
  );
};
