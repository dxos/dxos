//
// Copyright 2026 DXOS.org
//

// Two contexts (Item / Input) instead of one — performance optimization
// from the original SearchList: items don't subscribe to query / input
// state, so typing in the input doesn't re-render every option.

import { createContext } from '@radix-ui/react-context';

/** Stable: items subscribe to selection, registry. Doesn't change on query. */
export type PickerItemContextValue = {
  /** Currently highlighted item value (virtual; not browser focus). */
  selectedValue: string | undefined;
  /** Update the highlighted value (e.g. arrow keys, hover). */
  onSelectedValueChange: (value: string | undefined) => void;
  /** Register an item for keyboard nav + DOM-order traversal. */
  registerItem: (
    value: string,
    element: HTMLElement | null,
    onSelect: (() => void) | undefined,
    disabled?: boolean,
  ) => void;
  /** Unregister an item. */
  unregisterItem: (value: string) => void;
};

/** Volatile: input subscribes to selection + the input keyboard helpers. */
export type PickerInputContextValue = {
  /** Currently highlighted item value. */
  selectedValue: string | undefined;
  /** Update the highlighted value. */
  onSelectedValueChange: (value: string | undefined) => void;
  /** Get registered item values in DOM order (excludes disabled). */
  getItemValues: () => string[];
  /** Trigger the highlighted item's `onSelect`. */
  triggerSelect: () => void;
};

export const [PickerItemContextProvider, usePickerItemContext] = createContext<PickerItemContextValue>('PickerItem');

export const [PickerInputContextProvider, usePickerInputContext] =
  createContext<PickerInputContextValue>('PickerInput');
