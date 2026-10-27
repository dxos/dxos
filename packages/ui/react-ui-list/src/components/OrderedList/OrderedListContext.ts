//
// Copyright 2026 DXOS.org
//

import type * as DragHandle from '@dxos/react-ui/DragHandle';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Listbox from '@dxos/react-ui/Listbox';

import { type ReorderListController } from '../../hooks/index.ts';

// Kept out of the component module: react-refresh only fast-refreshes a module whose exports are all components.

export type OrderedListContextValue = {
  reorder: ReorderListController<unknown>;
  /** The listbox option of each row, by id. */
  options: ReadonlyMap<string, Listbox.Option>;
  readonly?: boolean;
  /** Keyboard move from the row's DragHandle, resolved against the current order. */
  move: (id: string, direction: DragHandle.DragMoveDirection) => void;
};

export const [OrderedListProvider, useOrderedListContext] = Hooks.createContext<OrderedListContextValue>('OrderedList');

export type OrderedListItemContextValue = {
  id: string;
  canDrag: boolean;
  handleRef: (element: HTMLElement | null) => void;
};

export const [OrderedListItemProvider, useOrderedListItemContext] =
  Hooks.createContext<OrderedListItemContextValue>('OrderedList.Item');
