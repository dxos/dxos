import * as Hooks from '@dxos/react-ui/Hooks';
//
// Copyright 2025 DXOS.org
//

/** Context for items - stable, doesn't change when query changes */
export type SearchListItemContextValue = {
  /** Currently selected item value for keyboard navigation. */
  selectedValue: string | undefined;
  /** Update the selected value. */
  onSelectedValueChange: (value: string | undefined) => void;
  /** Register an item for keyboard navigation. */
  registerItem: (
    value: string,
    element: HTMLElement | null,
    onSelect: (() => void) | undefined,
    disabled?: boolean,
  ) => void;
  /** Unregister an item. */
  unregisterItem: (value: string) => void;
};

/** Context for input - can change frequently with query */
export type SearchListInputContextValue = {
  /** Current search query. */
  query: string;
  /** Update the query value. */
  onQueryChange: (query: string) => void;
  /** Currently selected item value for keyboard navigation. */
  selectedValue: string | undefined;
  /** Update the selected value. */
  onSelectedValueChange: (value: string | undefined) => void;
  /** Get ordered list of registered item values (excludes disabled items). */
  getItemValues: () => string[];
  /** Trigger selection of the currently highlighted item. */
  triggerSelect: () => void;
};

export const [SearchListItemContextProvider, useSearchListItemContext] =
  Hooks.createContext<SearchListItemContextValue>('SearchListItem');
export const [SearchListInputContextProvider, useSearchListInputContext] =
  Hooks.createContext<SearchListInputContextValue>('SearchListInput');
