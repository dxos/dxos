//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { type ComponentPropsWithRef } from 'react';

import { createContext } from '@dxos/react-hooks';

// Kept out of `List.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const LIST_NAME = 'List';

export type ListVariant = 'ordered' | 'unordered';

export type ListItemSizes = 'one' | 'many';

export type ListProps = ComponentPropsWithRef<typeof ark.ol> & {
  /**
   * If true, render as `role="listbox"` and let `ListItem` children become
   * `role="option"` + `aria-selected`. If false (default) the list is a
   * plain `<ol>` / `<ul>` with no selection semantics — pick this for
   * static lists.
   */
  selectable?: boolean;
  /**
   * If true, the listbox advertises multi-select via
   * `aria-multiselectable="true"`. Defaults to false (single-select).
   * Has no effect unless `selectable` is also true.
   */
  multiSelectable?: boolean;
  variant?: ListVariant;
  itemSizes?: ListItemSizes;
};

export type ListContextValue = {
  selectable: Exclude<ListProps['selectable'], undefined>;
  variant: Exclude<ListProps['variant'], undefined>;
  itemSizes?: ListItemSizes;
};

export const [ListProvider, useListContext] = createContext<ListContextValue>(LIST_NAME);
