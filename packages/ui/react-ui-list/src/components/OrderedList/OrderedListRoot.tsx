//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { List, type ListItemRecord } from '../List';

const ORDERED_LIST_NAME = 'OrderedList';

type OrderedListContextValue = {
  expandedId?: string;
  setExpanded: (id: string | undefined) => void;
  readonly?: boolean;
};

const [OrderedListProvider, useOrderedListContext] = createContext<OrderedListContextValue>(ORDERED_LIST_NAME);

export { useOrderedListContext };

export type OrderedListRootProps<T extends ListItemRecord> = ThemedClassName<{
  items: readonly T[];
  /** DnD type guard forwarded to the underlying `List.Root`. */
  isItem: (item: any) => boolean;
  /**
   * Stable id accessor. Optional: falls back to `List`'s reference equality.
   * Synthetic-id reconciliation for plain-value arrays lands with the ordered ArrayField.
   */
  getId?: (item: T) => string;
  onMove?: (fromIndex: number, toIndex: number) => void;
  readonly?: boolean;
  /** Controlled expanded item id (single-expand). */
  expandedId?: string;
  defaultExpandedId?: string;
  onExpandedChange?: (id: string | undefined) => void;
  children: (props: { items: readonly T[] }) => ReactNode;
}>;

/**
 * Reorderable, single-expandable master-detail list. Wraps the deprecated `List`
 * primitive and owns the drag-handle / delete / expand-caret chrome plus expand state.
 */
export const OrderedListRoot = <T extends ListItemRecord>({
  items,
  isItem,
  getId,
  onMove,
  readonly,
  expandedId: expandedIdProp,
  defaultExpandedId,
  onExpandedChange,
  children,
}: OrderedListRootProps<T>) => {
  const [expandedId, setExpanded] = useControllableState<string | undefined>({
    prop: expandedIdProp,
    defaultProp: defaultExpandedId,
    onChange: onExpandedChange,
  });

  return (
    <OrderedListProvider expandedId={expandedId} setExpanded={setExpanded} readonly={readonly}>
      <List.Root<T> items={items} isItem={isItem} getId={getId} onMove={onMove} readonly={readonly}>
        {({ items: resolved }) => children({ items: resolved })}
      </List.Root>
    </OrderedListProvider>
  );
};

/** `role='list'` flex-column layout container. */
export const OrderedListContent = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div role='list' className={mx('flex flex-col', classNames)}>
    {children}
  </div>
);
