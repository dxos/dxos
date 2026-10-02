//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type PropsWithChildren,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import { Next } from '@dxos/react-ui/next';
import * as Util from '@dxos/react-ui/Util';
import { osTranslations } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { useListDisclosure, useReorderAutoScroll, useReorderItem, useReorderList } from '../../hooks/index.ts';
import {
  OrderedListItemProvider,
  OrderedListProvider,
  useOrderedListContext,
  useOrderedListItemContext,
} from './OrderedListContext.ts';

type ScrollAreaRootProps = ComponentPropsWithoutRef<typeof Next.ScrollArea.Root>;

//
// Root
//

type OrderedListRootProps<T> = {
  items: readonly T[];
  /** Stable id per item; a pragmatic-dnd round trip serialises the payload, so identity cannot be by reference. */
  getId: (item: T) => string;
  /** Called with `(fromIndex, toIndex)` after a pointer drop or a keyboard move. */
  onMove?: (fromIndex: number, toIndex: number) => void;
  /**
   * The native drag preview: `'clone'` snapshots the row; a renderer's content is drawn in a `Next.DragPreview` chip at
   * the row's size and level. Without either the browser snapshots the row in place.
   */
  dragPreview?: 'clone' | ((item: T) => ReactNode);
  readonly?: boolean;
  /** Controlled expanded item id (single-expand). */
  expandedId?: string;
  defaultExpandedId?: string;
  onExpandedChange?: (id: string | undefined) => void;
  children: (props: { items: readonly T[] }) => ReactNode;
};

const noop = () => {};

/**
 * Reorderable, single-expandable list: pragmatic-dnd reorder (`useReorderList`), keyboard moves from each row's
 * DragHandle, and single-expand disclosure (`useListDisclosure`). Renders no DOM; `Content` is the list element.
 */
const OrderedListRoot = <T,>(props: OrderedListRootProps<T>) => {
  const {
    items,
    getId,
    onMove = noop,
    dragPreview,
    readonly,
    expandedId,
    defaultExpandedId,
    onExpandedChange,
    children,
  } = props;
  const preview = useMemo(
    () =>
      typeof dragPreview === 'function'
        ? (item: T, source: HTMLElement) => <Next.DragPreview source={source}>{dragPreview(item)}</Next.DragPreview>
        : dragPreview,
    [dragPreview],
  );
  const { controller } = useReorderList<T>({ items, getId, onMove, dragPreview: preview, readonly });
  const disclosure = useListDisclosure({
    mode: 'single',
    // The hook treats a present `value` key as controlled, so an uncontrolled list must omit it.
    ...('expandedId' in props ? { value: expandedId } : {}),
    defaultValue: defaultExpandedId,
    onValueChange: (next) => onExpandedChange?.(next),
  });

  // Read through refs so `move` stays stable while items change under it.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getIdRef = useRef(getId);
  getIdRef.current = getId;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const move = useCallback((id: string, direction: Next.DragMoveDirection) => {
    const from = itemsRef.current.findIndex((item) => getIdRef.current(item) === id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= itemsRef.current.length) {
      return;
    }
    onMoveRef.current(from, to);
  }, []);

  return (
    <OrderedListProvider reorder={controller} disclosure={disclosure} readonly={readonly} move={move}>
      {children({ items })}
    </OrderedListProvider>
  );
};

//
// Content
//

type OrderedListContentProps = Next.ContainerProps &
  Pick<ScrollAreaRootProps, 'mode' | 'width'> & {
    /**
     * `true` (the default) makes the list the viewport of a thin ScrollArea that a drag near its edges auto-scrolls;
     * `false` leaves scrolling to a host that already scrolls, as `Listbox.Content` does.
     */
    scroll?: boolean;
  };

/** The `list`: a stack Container (`inset` gutter by default) whose children are the rows. */
const OrderedListContent: ForwardRefExoticComponent<
  ComposableProps<OrderedListContentProps> & RefAttributes<HTMLDivElement>
> = Util.composable<HTMLDivElement, OrderedListContentProps>(
  ({ gutter = 'inset', scroll = true, mode, width, children, ...props }, forwardedRef) => {
    const autoScrollRef = useReorderAutoScroll();
    const list = (
      <Next.Container role='list' {...props} gutter={gutter} ref={forwardedRef}>
        {children}
      </Next.Container>
    );
    return scroll ? (
      <Next.ScrollArea.Root mode={mode} width={width}>
        <Next.ScrollArea.Viewport asChild ref={autoScrollRef}>
          {list}
        </Next.ScrollArea.Viewport>
      </Next.ScrollArea.Root>
    ) : (
      list
    );
  },
);

OrderedListContent.displayName = 'OrderedList.Content';

//
// Item
//

const useItemBinding = (id: string, canDrag: boolean) => {
  const { reorder, disclosure } = useOrderedListContext('OrderedList.Item');
  const { rowRef, handleRef, closestEdge, isDragging } = useReorderItem(reorder, id);
  const indicator =
    closestEdge === 'top' || closestEdge === 'bottom' ? <Next.DropIndicator edge={closestEdge} /> : null;
  return {
    rowRef,
    indicator,
    dragging: isDragging ? '' : undefined,
    disclosure: disclosure.bind(id),
    item: { id, canDrag, handleRef },
  };
};

type OrderedListItemProps = Omit<ComponentPropsWithoutRef<typeof Next.Container>, 'layout' | 'id'> & {
  id: string;
  /** Defaults to true; false disables the drag handle. */
  canDrag?: boolean;
};

/**
 * A reorderable row: a `listitem` row Container whose `columns` place its children (e.g. a DragHandle cell, a title and
 * a trailing action). Shows the drop indicator on the edge a dragged row will land on.
 */
const OrderedListItem = ({ id, canDrag = true, children, ...props }: OrderedListItemProps) => {
  const { rowRef, indicator, dragging, item } = useItemBinding(id, canDrag);
  return (
    <OrderedListItemProvider {...item}>
      <Next.Container role='listitem' {...props} layout='row' data-dragging={dragging} ref={rowRef}>
        {children}
        {indicator}
      </Next.Container>
    </OrderedListItemProvider>
  );
};

//
// DragHandle
//

/**
 * The row's grip (`Next.DragHandle`): the pointer drag source and, from the keyboard, Alt+Arrow or grab-and-arrow
 * moves. Disabled when the list is readonly or the row opts out.
 */
const OrderedListDragHandle = () => {
  const { t } = Hooks.useTranslation(osTranslations);
  const { readonly, move } = useOrderedListContext('OrderedList.DragHandle');
  const { id, canDrag, handleRef } = useOrderedListItemContext('OrderedList.DragHandle');
  return (
    <Next.DragHandle
      label={t('drag-handle.label')}
      disabled={readonly || !canDrag}
      onMove={(direction) => move(id, direction)}
      ref={handleRef}
    />
  );
};

//
// ItemText
//

type OrderedListItemTextProps = ComponentPropsWithoutRef<typeof Next.Typography>;

/** The row's text, truncated to one line. */
const OrderedListItemText = (props: OrderedListItemTextProps) => <Next.Typography truncate {...props} />;

//
// DetailItem
//

type OrderedListDetailItemProps = PropsWithChildren<{
  'id': string;
  'canDrag'?: boolean;
  /** The disclosure trigger's label. */
  'title': ReactNode;
  /** Inline actions after the title (e.g. a visibility toggle). */
  'actions'?: ReactNode;
  /** Action(s) at the row's end (e.g. a delete button). */
  'trailing'?: ReactNode;
  /** When false, the title is plain text and there is no detail. Defaults to true. */
  'expandable'?: boolean;
  'data-testid'?: string;
}>;

/**
 * Master-detail row: a `listitem` Collapsible holding a row (drag handle, the title as the disclosure trigger, actions,
 * trailing) over the detail, so the handle and trailing stay on the title's line when the detail opens.
 */
const OrderedListDetailItem = ({
  id,
  canDrag = true,
  title,
  actions,
  trailing,
  expandable = true,
  children,
  'data-testid': testId,
}: OrderedListDetailItemProps) => {
  const { rowRef, indicator, dragging, disclosure, item } = useItemBinding(id, canDrag);
  const columns = ['var(--nx-block-size)', 'minmax(0, 1fr)', actions && 'auto', trailing && 'auto']
    .filter(Boolean)
    .join(' ');
  return (
    <OrderedListItemProvider {...item}>
      <Next.Collapsible.Root
        role='listitem'
        open={expandable && disclosure.expanded}
        onOpenChange={({ open }) => open !== disclosure.expanded && disclosure.toggle()}
        lazyMount
        unmountOnExit
        data-dragging={dragging}
        data-testid={testId}
        ref={rowRef}
      >
        <Next.Container layout='row' gutter='none' columns={columns}>
          <OrderedListDragHandle />
          {expandable ? (
            <Next.Collapsible.Trigger>{title}</Next.Collapsible.Trigger>
          ) : (
            <OrderedListItemText>{title}</OrderedListItemText>
          )}
          {actions}
          {trailing}
        </Next.Container>
        {expandable && <Next.Collapsible.Content>{children}</Next.Collapsible.Content>}
        {indicator}
      </Next.Collapsible.Root>
    </OrderedListItemProvider>
  );
};

/**
 * Reorderable, single-expandable list on Next parts. Rows are Container rows (`Item`, laid out by `columns`) or
 * Collapsible master-detail rows (`DetailItem`); `DragHandle` drags with the pointer and moves from the keyboard.
 *
 * @example
 *   <OrderedList.Root items={items} getId={(item) => item.id} onMove={move}>
 *     {({ items }) => (
 *       <OrderedList.Content>
 *         {items.map((item) => (
 *           <OrderedList.Item key={item.id} id={item.id} columns='var(--nx-block-size) minmax(0, 1fr)'>
 *             <OrderedList.DragHandle />
 *             <OrderedList.ItemText>{item.label}</OrderedList.ItemText>
 *           </OrderedList.Item>
 *         ))}
 *       </OrderedList.Content>
 *     )}
 *   </OrderedList.Root>
 */
export const OrderedList: {
  Root: typeof OrderedListRoot;
  Content: typeof OrderedListContent;
  Item: typeof OrderedListItem;
  DetailItem: typeof OrderedListDetailItem;
  DragHandle: typeof OrderedListDragHandle;
  ItemText: typeof OrderedListItemText;
} = {
  Root: OrderedListRoot,
  Content: OrderedListContent,
  Item: OrderedListItem,
  DetailItem: OrderedListDetailItem,
  DragHandle: OrderedListDragHandle,
  ItemText: OrderedListItemText,
};

export type {
  OrderedListContentProps,
  OrderedListDetailItemProps,
  OrderedListItemProps,
  OrderedListItemTextProps,
  OrderedListRootProps,
};
