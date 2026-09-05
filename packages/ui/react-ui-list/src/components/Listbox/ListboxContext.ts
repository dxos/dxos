//
// Copyright 2022 DXOS.org
//

import { createContext } from '@dxos/react-ui';

import { type UseListSelectionReturn } from '../../hooks';

//
// Contexts — plain Radix contexts (un-scoped). Scoped composition (nested Listboxes,
// Combobox embeddings) is a future expansion; when needed, switch to `createContextScope`
// and thread `__listboxScope` through every subcomponent's props in one focused PR.
//
// Kept out of `Listbox.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so contexts and hooks exported beside them force a full page reload on every edit.
//

export const LISTBOX_NAME = 'Listbox';
export const LISTBOX_ITEM_NAME = 'Listbox.Item';

export type ListboxContextValue = {
  /**
   * Whether the list participates in selection. Inferred on `Root` from the presence of
   * `value`/`defaultValue`/`onValueChange`. Drives `role` (listbox/option vs list/listitem),
   * `aria-selected`, and whether row clicks update the selection model.
   */
  selectable: boolean;
  /**
   * Externally-managed multi-select: rows are `option`s in an `aria-multiselectable` listbox and
   * carry the caller's `selected` state, but the internal selection model stays disengaged.
   */
  multiselectable: boolean;
  /** Selection aspect binding factory; items consume their own bindings from this. */
  selection: UseListSelectionReturn;
};

export type ListboxItemContextValue = {
  id: string;
  selected: boolean;
};

export const [ListboxProvider, useListboxContext] = createContext<ListboxContextValue>(LISTBOX_NAME);
export const [ListboxItemProvider, useListboxItemContext] = createContext<ListboxItemContextValue>(LISTBOX_ITEM_NAME);

/**
 * Read selection state for a single id from inside any descendant of `<Listbox.Root>`.
 * Returns `true` when the row is currently selected. Lets composing components react to
 * selection without re-rendering on unrelated changes.
 */
export const useListboxSelection = (id: string): boolean => {
  const { selection } = useListboxContext('useListboxSelection');
  return selection.bind(id).selected;
};
