//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type ReactNode, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  type ReorderActive,
  type ReorderListController,
  type UseListNavigationReturn,
  type UseListDisclosureReturn,
  useListDisclosure,
  useListNavigation,
  useReorderList,
} from '../../aspects';

export type ListItemRecord = any;

const ORDERED_LIST_NAME = 'OrderedList';

type OrderedListContextValue<T extends ListItemRecord> = {
  reorder: ReorderListController<T>;
  disclosure: UseListDisclosureReturn;
  navigation: UseListNavigationReturn;
  readonly?: boolean;
  active: ReorderActive<T>;
  /**
   * Stable id accessor reused by items that want to look up their record (e.g. the
   * `OrderedListItem` <-> `useReorderItem` plumbing).
   */
  getId: (item: T) => string;
};

const [OrderedListProvider, useOrderedListContext] =
  createContext<OrderedListContextValue<any>>(ORDERED_LIST_NAME);

export { useOrderedListContext };

export type OrderedListRootProps<T extends ListItemRecord> = ThemedClassName<{
  items: readonly T[];
  /**
   * Type guard reserved for backwards compatibility with the deprecated `List` API. The
   * aspect layer doesn't need it (payloads are scoped via the list's internal id) — values
   * passed here are currently ignored. Will be removed when call-sites migrate.
   */
  isItem?: (item: any) => boolean;
  /**
   * Stable id accessor. When omitted, the hook falls back to reference equality, which
   * breaks after a pragmatic-dnd round-trip serialises the payload — supply a `getId` for
   * any list whose items are plain values rather than ECHO refs.
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

const defaultGetId = <T extends ListItemRecord>(item: T) => (item as any)?.id;
const noopMove = () => {};

/**
 * Reorderable, single-expandable master-detail list. Wraps the aspect hooks:
 *
 * - `useReorderList` — drag-and-drop reorder via pragmatic-dnd.
 * - `useListDisclosure` (single mode) — single-expand state machine.
 * - `useListNavigation` (list mode) — Tabster keyboard nav across items.
 *
 * Owns the drag-handle / delete / expand-caret chrome plus expand state. Renders no DOM
 * itself; `OrderedListContent` is the container.
 */
export const OrderedListRoot = <T extends ListItemRecord>({
  items,
  getId = defaultGetId,
  onMove = noopMove,
  readonly,
  expandedId,
  defaultExpandedId,
  onExpandedChange,
  children,
}: OrderedListRootProps<T>) => {
  const { controller, active } = useReorderList<T>({
    items,
    getId,
    onMove,
    readonly,
  });

  const disclosure = useListDisclosure({
    mode: 'single',
    value: expandedId,
    defaultValue: defaultExpandedId,
    onValueChange: (next) => onExpandedChange?.(next),
  });

  const navigation = useListNavigation({ mode: 'list' });

  // Memoise the context value so identity-stable items don't re-render on aspect re-renders
  // that don't affect their bindings (e.g. an unrelated drag-state change).
  const context = useMemo(
    () => ({
      reorder: controller,
      disclosure,
      navigation,
      readonly,
      active,
      getId,
    }),
    [controller, disclosure, navigation, readonly, active, getId],
  );

  return <OrderedListProvider {...context}>{children({ items })}</OrderedListProvider>;
};

/**
 * Container for the list. Applies the navigation aspect's `containerProps` so role,
 * aria-orientation, Tabster attributes, and focus-on-entry are wired in one place.
 */
export const OrderedListContent = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  const { navigation } = useOrderedListContext('OrderedList.Content');
  return (
    <div {...navigation.containerProps} className={mx('flex flex-col', classNames)}>
      {children}
    </div>
  );
};
