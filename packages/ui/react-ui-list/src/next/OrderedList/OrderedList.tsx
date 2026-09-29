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

import { type ComposableProps, composable, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { osTranslations } from '@dxos/ui-theme';

import { useListDisclosure, useReorderAutoScroll, useReorderItem, useReorderList } from '../../hooks/index.ts';
import {
  OrderedListItemProvider,
  OrderedListProvider,
  useOrderedListContext,
  useOrderedListItemContext,
} from './OrderedListContext.ts';

type ScrollAreaRootProps = ComponentPropsWithoutRef<typeof Next.ScrollArea.Root>;
type ButtonProps = ComponentPropsWithoutRef<typeof Next.Button>;

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
// Viewport
//

type OrderedListViewportProps = PropsWithChildren<Pick<ScrollAreaRootProps, 'mode' | 'width'>>;

/**
 * Optional thin ScrollArea whose viewport is the `Content` itself (no extra element); a drag near its edges
 * auto-scrolls it.
 */
const OrderedListViewport = ({ mode, width, children }: OrderedListViewportProps) => {
  const autoScrollRef = useReorderAutoScroll();
  return (
    <Next.ScrollArea.Root mode={mode} width={width}>
      <Next.ScrollArea.Viewport asChild ref={autoScrollRef}>
        {children}
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  );
};

//
// Content
//

type OrderedListContentProps = Next.ContainerProps;

/**
 * The `list`: a stack Container (`inset` gutter by default) whose children are the rows. Composable, so a Viewport's
 * slot makes it the scrolling element.
 */
const OrderedListContent: ForwardRefExoticComponent<
  ComposableProps<OrderedListContentProps> & RefAttributes<HTMLDivElement>
> = composable<HTMLDivElement, OrderedListContentProps>(({ gutter = 'inset', children, ...props }, forwardedRef) => {
  const { reorder } = useOrderedListContext('OrderedList.Content');
  const cleanupRef = useRef<(() => void) | null>(null);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = node ? reorder.bindList(node) : null;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [reorder, forwardedRef],
  );

  return (
    <Next.Container role='list' {...props} gutter={gutter} ref={ref}>
      {children}
    </Next.Container>
  );
});

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
  const { t } = useTranslation(osTranslations);
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
// Title
//

type OrderedListTitleProps = ComponentPropsWithoutRef<typeof Next.Typography>;

/** The row's text, truncated to one line. */
const OrderedListTitle = (props: OrderedListTitleProps) => <Next.Typography truncate {...props} />;

//
// IconButton / DeleteButton
//

type OrderedListIconButtonProps = Omit<ButtonProps, 'variant' | 'iconOnly'>;

/** A ghost icon-only Button for an inline row action. */
const OrderedListIconButton = (props: OrderedListIconButtonProps) => (
  <Next.Button {...props} variant='ghost' iconOnly />
);

type OrderedListDeleteButtonProps = Omit<OrderedListIconButtonProps, 'icon' | 'label'> & {
  icon?: string;
  label?: string;
};

const OrderedListDeleteButton = ({ icon = 'ph--x--regular', label, ...props }: OrderedListDeleteButtonProps) => {
  const { t } = useTranslation(osTranslations);
  return <OrderedListIconButton {...props} icon={icon} label={label ?? t('delete.label')} />;
};

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
            <OrderedListTitle>{title}</OrderedListTitle>
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
 *             <OrderedList.Title>{item.label}</OrderedList.Title>
 *           </OrderedList.Item>
 *         ))}
 *       </OrderedList.Content>
 *     )}
 *   </OrderedList.Root>
 */
export const OrderedList: {
  Root: typeof OrderedListRoot;
  Viewport: typeof OrderedListViewport;
  Content: typeof OrderedListContent;
  Item: typeof OrderedListItem;
  DetailItem: typeof OrderedListDetailItem;
  DragHandle: typeof OrderedListDragHandle;
  Title: typeof OrderedListTitle;
  IconButton: typeof OrderedListIconButton;
  DeleteButton: typeof OrderedListDeleteButton;
} = {
  Root: OrderedListRoot,
  Viewport: OrderedListViewport,
  Content: OrderedListContent,
  Item: OrderedListItem,
  DetailItem: OrderedListDetailItem,
  DragHandle: OrderedListDragHandle,
  Title: OrderedListTitle,
  IconButton: OrderedListIconButton,
  DeleteButton: OrderedListDeleteButton,
};

export type {
  OrderedListContentProps,
  OrderedListDeleteButtonProps,
  OrderedListDetailItemProps,
  OrderedListIconButtonProps,
  OrderedListItemProps,
  OrderedListRootProps,
  OrderedListTitleProps,
  OrderedListViewportProps,
};
