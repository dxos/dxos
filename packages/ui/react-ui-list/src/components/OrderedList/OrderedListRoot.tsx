//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, useMemo } from 'react';

import {
  ScrollArea,
  type ScrollAreaRootProps,
  type ThemedClassName,
  composable,
  composableProps,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useListDisclosure, useListNavigation, useReorderAutoScroll, useReorderList } from '../../hooks';
import { listTheme } from '../List.theme';
import { type ListItemRecord, OrderedListProvider, useOrderedListContext } from './OrderedListContext';

const styles = listTheme.styles();

export type { ListItemRecord };

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
  /**
   * Keyboard grammar. `list` (default) leaves the rows themselves unfocusable, so arrows move among
   * whatever interactive controls a row holds. `listbox` makes each row a stop — the right mode when
   * the list carries a selection, since a reader then arrows between entries rather than between
   * their buttons.
   */
  navigationMode?: 'list' | 'listbox';
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
 * - `useListNavigation` (list mode) — roving-tabindex keyboard nav across items.
 *
 * Owns the drag-handle / delete / expand-caret chrome plus expand state. Renders no DOM
 * itself; `OrderedListContent` is the container.
 */
export const OrderedListRoot = <T extends ListItemRecord>({
  items,
  getId = defaultGetId,
  onMove = noopMove,
  readonly,
  navigationMode = 'list',
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

  const navigation = useListNavigation({ mode: navigationMode });

  // Memoise the context value so identity-stable items don't re-render on aspect re-renders
  // that don't affect their bindings (e.g. an unrelated drag-state change).
  const context = useMemo(
    () => ({
      reorder: controller,
      disclosure,
      navigation,
      navigationMode,
      readonly,
      active,
      getId,
    }),
    [controller, disclosure, navigation, navigationMode, readonly, active, getId],
  );

  return <OrderedListProvider {...context}>{children({ items })}</OrderedListProvider>;
};

/**
 * Container for the list. Applies the navigation aspect's `containerProps` so role,
 * aria-orientation, focus-group attributes, and focus-on-entry are wired in one place.
 */
export const OrderedListContent = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  const { navigation } = useOrderedListContext('OrderedList.Content');
  return (
    <div {...navigation.containerProps} className={styles.orderedListContent({ class: mx(classNames) })}>
      {children}
    </div>
  );
};

/**
 * Optional ScrollArea wrapper for the list. Mirrors `Listbox.Viewport`. Include when the
 * list needs to fill a constrained pane and scroll independently; omit for static lists
 * that flow with their parent.
 *
 * Wires `useReorderAutoScroll` on the inner viewport so pragmatic-dnd auto-scrolls the
 * container when a drag hovers near its edges — long lists can be reordered without
 * scrolling manually first.
 */
type OrderedListViewportProps = Pick<ScrollAreaRootProps, 'thin' | 'padding' | 'centered'>;

export const OrderedListViewport = composable<HTMLDivElement, OrderedListViewportProps>((props, forwardedRef) => {
  const { thin, padding, centered, children, ...rest } = props as PropsWithChildren<
    OrderedListViewportProps & Record<string, unknown>
  >;
  // Callback ref so registration fires on attach and cleanup on detach — `useEffect` on a
  // ref object would miss the element entirely (ref mutations don't re-run effects).
  const autoScrollRef = useReorderAutoScroll();
  return (
    <ScrollArea.Root
      {...composableProps<HTMLDivElement>(rest, { classNames: styles.orderedListViewport() })}
      {...{ thin, padding, centered }}
      orientation='vertical'
      ref={forwardedRef}
    >
      <ScrollArea.Viewport ref={autoScrollRef}>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

OrderedListViewport.displayName = 'OrderedList.Viewport';

export type { OrderedListViewportProps };
