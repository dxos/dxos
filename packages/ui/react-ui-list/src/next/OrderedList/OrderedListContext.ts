//
// Copyright 2026 DXOS.org
//

import { createContext } from '@dxos/react-ui';
import { type Next } from '@dxos/react-ui/next';

import { type ReorderListController, type UseListDisclosureReturn } from '../../hooks/index.ts';

// Kept out of the component module: react-refresh only fast-refreshes a module whose exports are all components.

export type OrderedListContextValue = {
  reorder: ReorderListController<unknown>;
  disclosure: UseListDisclosureReturn;
  readonly?: boolean;
  /** Keyboard move from the row's DragHandle, resolved against the current order. */
  move: (id: string, direction: Next.DragMoveDirection) => void;
};

export const [OrderedListProvider, useOrderedListContext] = createContext<OrderedListContextValue>('OrderedList');

export type OrderedListItemContextValue = {
  id: string;
  canDrag: boolean;
  handleRef: (element: HTMLElement | null) => void;
};

export const [OrderedListItemProvider, useOrderedListItemContext] =
  createContext<OrderedListItemContextValue>('OrderedList.Item');
