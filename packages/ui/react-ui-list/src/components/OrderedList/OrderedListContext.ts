//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import {
  type ReorderActive,
  type ReorderListController,
  type UseListDisclosureReturn,
  type UseListNavigationReturn,
} from '../../hooks';

// Kept out of `OrderedListRoot.tsx`: react-refresh only fast-refreshes a module whose exports are
// all components, so a context exported beside them forces a full page reload on every edit.

export type ListItemRecord = any;

export const ORDERED_LIST_NAME = 'OrderedList';

export type OrderedListContextValue<T extends ListItemRecord> = {
  reorder: ReorderListController<T>;
  disclosure: UseListDisclosureReturn;
  navigation: UseListNavigationReturn;
  /** Mirrors the mode given to `useListNavigation`, so a row knows which aria grammar it is in. */
  navigationMode: 'list' | 'listbox';
  readonly?: boolean;
  active: ReorderActive<T>;
  /**
   * Stable id accessor reused by items that want to look up their record (e.g. the
   * `OrderedListItem` <-> `useReorderItem` plumbing).
   */
  getId: (item: T) => string;
};

export const [OrderedListProvider, useOrderedListContext] =
  createContext<OrderedListContextValue<any>>(ORDERED_LIST_NAME);
