//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, createContext, useCallback, useContext } from 'react';

/** What an item can do about its own selection — the item-side face of the host's selection model. */
export type ItemSelection = {
  selected: boolean;
  /** Additive when the gesture says so (meta/ctrl); the mode is the provider's business. */
  toggle: (additive?: boolean) => void;
};

export type ItemSelectionValue = {
  selectedIds?: ReadonlySet<string>;
  onSelect?: (id: string, additive: boolean) => void;
};

const ItemSelectionContext = createContext<ItemSelectionValue>({});

export type ItemSelectionProviderProps = PropsWithChildren<ItemSelectionValue>;

/**
 * The item-side hook of the decoration pattern applied to selection (SPEC: useItemSelection): an
 * item asks for its own `{ selected, toggle }` by id instead of the list threading `selectedIds`
 * through props. Selection is model-space ids, so virtualization is untouched: an unmounted item is
 * still selected, and mounts knowing it.
 *
 * The provider is deliberately the thinnest thing that works — a set and a callback. Mode policies
 * (single | multi | range) belong to `react-ui-list`'s `useListSelection`, which a host composes
 * *above* this provider; teaching this package about modes would be rebuilding that hook.
 */
export const ItemSelectionProvider = ({ selectedIds, onSelect, children }: ItemSelectionProviderProps) => (
  <ItemSelectionContext.Provider value={{ selectedIds, onSelect }}>{children}</ItemSelectionContext.Provider>
);

/**
 * The whole selection value, for a component that renders many items in one pass.
 *
 * A row loop cannot call `useItemSelection` per row — hooks do not run in loops — so the viewport
 * reads the value once and derives per-row state; item-shaped components use the per-id hook.
 */
export const useItemSelectionValue = (): ItemSelectionValue => useContext(ItemSelectionContext);

export const useItemSelection = (id: string): ItemSelection => {
  const { selectedIds, onSelect } = useContext(ItemSelectionContext);
  const toggle = useCallback((additive = true) => onSelect?.(id, additive), [id, onSelect]);
  return { selected: selectedIds?.has(id) ?? false, toggle };
};

/** Reads the additive intent off a gesture, so callers do not each invent the modifier rule. */
export const isAdditive = (event: MouseEvent | globalThis.MouseEvent): boolean =>
  event.metaKey || event.ctrlKey || event.shiftKey;
