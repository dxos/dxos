//
// Copyright 2026 DXOS.org
//

// Two contexts (Item / Input) instead of one — performance optimization
// from the original SearchList: items don't subscribe to query / input
// state, so typing in the input doesn't re-render every option.
//
// Kept out of `Picker.tsx` (and not re-exported from it): react-refresh only fast-refreshes a module
// whose exports are all components, so contexts and hooks exported beside them force a full page
// reload on every edit.

import { createContext } from '@radix-ui/react-context';

/** Stable: items subscribe to selection, registry. Doesn't change on query. */
export type PickerItemContextValue = {
  /** Namespace for item element ids, so `aria-activedescendant` can address them. */
  pickerId: string;
  /** Whether several options may be chosen at once. See `Picker.Root`. */
  multiselectable: boolean;
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
  /** Namespace for item element ids, so `aria-activedescendant` can address them. */
  pickerId: string;
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

/**
 * Element id of an item, addressed by the input's `aria-activedescendant`.
 * Values are caller-supplied (DXNs, tags, free text), so whitespace — which would split the
 * id-reference list — is collapsed.
 */
export const pickerItemId = (pickerId: string, value: string): string => `${pickerId}--${value.replace(/\s+/g, '-')}`;

export const [PickerInputContextProvider, usePickerInputContext] =
  createContext<PickerInputContextValue>('PickerInput');
