//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, {
  Children,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
  forwardRef,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as DragHandle from '@dxos/react-ui/DragHandle';
import * as Listbox from '@dxos/react-ui/Listbox';

import { useReorderAutoScroll, useReorderItem, useReorderList } from '../../hooks/index.ts';
import {
  OrderedListItemProvider,
  OrderedListProvider,
  useOrderedListContext,
  useOrderedListItemContext,
} from './OrderedListContext.ts';

type NextRootProps = ComponentPropsWithoutRef<typeof Listbox.Root>;
type NextContentProps = ComponentPropsWithoutRef<typeof Listbox.Content>;
type NextItemProps = ComponentPropsWithoutRef<typeof Listbox.Item>;

/** A row's value with the id the list knows it by. */
type Entry<T> = { id: string; item: T };

/** An item's own string `id`, else its position; a list of plain values without ids should use `useStableIds`. */
const defaultId = (item: unknown, index: number) =>
  typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string' ? item.id : String(index);

/** The row's `ItemText`, which labels the default drag preview when the Root has no `getLabel`. */
const itemText = (row: HTMLElement) => row.querySelector('[data-part="item-text"]')?.textContent ?? '';

//
// Root
//

type OrderedListRootProps<T> = Pick<NextRootProps, 'columns' | 'virtual' | 'size' | 'loopFocus'> & {
  items: readonly T[];
  /**
   * Stable id per item; a pragmatic-dnd round trip serialises the payload, so identity cannot be by reference. Defaults
   * to the item's own string `id`, else its index.
   */
  getId?: (item: T) => string;
  /** The row's text for typeahead and the default drag preview; the preview falls back to the row's `ItemText`. */
  getLabel?: (item: T) => string;
  /** Called with `(fromIndex, toIndex)` after a pointer drop or a keyboard move. */
  onMove?: (fromIndex: number, toIndex: number) => void;
  /**
   * The native drag preview. By default a `DragPreview` chip labelled by `getLabel` (or the row's `ItemText`); a
   * renderer's content is drawn in the chip instead; `'clone'` snapshots the row.
   */
  dragPreview?: 'clone' | ((item: T) => ReactNode);
  readonly?: boolean;
  /**
   * The selected row's id (controlled). Supplying it or `onValueChange` makes the list single-selection: a click, or
   * Enter on the highlighted row, selects; otherwise nothing is selected and zag only navigates.
   */
  value?: string;
  onValueChange?: (id: string) => void;
  children: (props: { items: readonly T[] }) => ReactNode;
};

const noop = () => {};

/**
 * A reorderable list on `Listbox` (no selection unless `value`/`onValueChange` ask for one; zag owns focus,
 * navigation and typeahead): pragmatic-dnd reorder (`useReorderList`) and keyboard moves from each row's DragHandle.
 */
const OrderedListRoot = <T,>({
  items,
  getId,
  getLabel,
  onMove = noop,
  dragPreview,
  readonly,
  columns,
  virtual,
  size,
  loopFocus,
  value,
  onValueChange,
  children,
}: OrderedListRootProps<T>) => {
  const selectable = value !== undefined || onValueChange !== undefined;
  const entries = useMemo(
    () => items.map((item, index) => ({ id: getId ? getId(item) : defaultId(item, index), item })),
    [items, getId],
  );
  const options = useMemo(
    () => entries.map(({ id, item }) => ({ value: id, label: getLabel?.(item) ?? '' })),
    [entries, getLabel],
  );
  const optionsById = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);

  const preview = useMemo(() => {
    if (dragPreview === 'clone') {
      return 'clone' as const;
    }
    return ({ item }: Entry<T>, source: HTMLElement) => (
      <DragHandle.DragPreview source={source}>
        {dragPreview ? dragPreview(item) : (getLabel?.(item) ?? itemText(source))}
      </DragHandle.DragPreview>
    );
  }, [dragPreview, getLabel]);

  const { controller } = useReorderList<Entry<T>>({
    items: entries,
    getId: (entry) => entry.id,
    onMove,
    dragPreview: preview,
    readonly,
  });

  // Read through refs so `move` stays stable while items change under it.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const move = useCallback((id: string, direction: DragHandle.DragMoveDirection) => {
    const from = entriesRef.current.findIndex((entry) => entry.id === id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= entriesRef.current.length) {
      return;
    }
    onMoveRef.current(from, to);
  }, []);

  return (
    <OrderedListProvider reorder={controller} options={optionsById} readonly={readonly} move={move}>
      <Listbox.Root
        items={options}
        selectionMode={selectable ? 'single' : 'none'}
        value={selectable ? (value === undefined ? [] : [value]) : undefined}
        onValueChange={([selected]) => selected !== undefined && onValueChange?.(selected)}
        columns={columns}
        virtual={virtual}
        size={size}
        loopFocus={loopFocus}
      >
        {children({ items })}
      </Listbox.Root>
    </OrderedListProvider>
  );
};

//
// Content
//

type OrderedListContentProps = NextContentProps;

/**
 * The listbox element, as `Listbox.Content`: its own thin ScrollArea by default (a drag near its edges
 * auto-scrolls it), or `scroll={false}` inside a host that scrolls.
 */
const OrderedListContent: ForwardRefExoticComponent<OrderedListContentProps & RefAttributes<HTMLDivElement>> =
  forwardRef<HTMLDivElement, OrderedListContentProps>(({ scroll = true, ...props }, forwardedRef) => {
    const autoScrollRef = useReorderAutoScroll();
    const ref = useCallback(
      (element: HTMLDivElement | null) => {
        if (scroll) {
          autoScrollRef(element);
        }
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
      },
      [scroll, autoScrollRef, forwardedRef],
    );
    return <Listbox.Content {...props} scroll={scroll} ref={ref} />;
  });

OrderedListContent.displayName = 'OrderedList.Content';

//
// Detail
//

type OrderedListDetailProps = ComponentPropsWithoutRef<typeof Collapsible.Content>;

/** A collapsible row's detail, below the row at its full width; a direct child of a collapsible `Item`. */
const OrderedListDetail = (props: OrderedListDetailProps) => <Collapsible.Content {...props} />;

OrderedListDetail.displayName = 'OrderedList.Detail';

const isDetail = (node: ReactNode) => isValidElement(node) && node.type === OrderedListDetail;

//
// Item
//

type OrderedListItemProps = Omit<NextItemProps, 'item' | 'id'> & {
  id: string;
  /** Defaults to true; false disables the drag handle. */
  canDrag?: boolean;
  /**
   * Makes the row collapsible (as does any of `open`, `defaultOpen`, `onOpenChange`): its root becomes a Collapsible
   * holding the one-line row, with a caret in the trailing column, over its `Detail` child at full width.
   */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A reorderable row (`option`): its parts lay out by part (a leading DragHandle or icon, the `ItemText`, trailing
 * controls) or across the Root's `columns`. Draws the drop indicator on the edge a dragged row will land on
 * (`data-drop-target`). Plain rows run no Collapsible machine.
 */
const OrderedListItem = ({
  id,
  canDrag = true,
  collapsible,
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: OrderedListItemProps) => {
  const { reorder, options } = useOrderedListContext('OrderedList.Item');
  const { rowRef, handleRef, isDragging } = useReorderItem(reorder, id);
  const option = options.get(id);
  if (!option) {
    return null;
  }

  const dragging = isDragging ? '' : undefined;
  const isCollapsible = collapsible || open !== undefined || defaultOpen !== undefined || onOpenChange !== undefined;
  if (!isCollapsible) {
    return (
      <OrderedListItemProvider id={id} canDrag={canDrag} handleRef={handleRef}>
        <Listbox.Item {...props} item={option} data-dragging={dragging} ref={rowRef}>
          {children}
        </Listbox.Item>
      </OrderedListItemProvider>
    );
  }

  const parts = Children.toArray(children);
  return (
    <OrderedListItemProvider id={id} canDrag={canDrag} handleRef={handleRef}>
      <Collapsible.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange && (({ open }) => onOpenChange(open))}
        lazyMount
        unmountOnExit
        data-dragging={dragging}
        ref={rowRef}
      >
        <Listbox.Item {...props} item={option}>
          {parts.filter((part) => !isDetail(part))}
          <Collapsible.Trigger />
        </Listbox.Item>
        {parts.filter(isDetail)}
      </Collapsible.Root>
    </OrderedListItemProvider>
  );
};

OrderedListItem.displayName = 'OrderedList.Item';

//
// DragHandle
//

type OrderedListDragHandleProps = {
  /**
   * Makes the single child the pointer drag source in place of the grip (e.g. a thumbnail a reader expects to grab);
   * it carries `data-disabled` while dragging is off. The keyboard moves need the grip.
   */
  asChild?: boolean;
  children?: ReactNode;
};

/**
 * The row's grip (`DragHandle`): the pointer drag source and, from the keyboard (inside the entered row),
 * Alt+Arrow or grab-and-arrow moves. Disabled when the list is readonly or the row opts out.
 */
const OrderedListDragHandle = ({ asChild, children }: OrderedListDragHandleProps) => {
  const { readonly, move } = useOrderedListContext('OrderedList.DragHandle');
  const { id, canDrag, handleRef } = useOrderedListItemContext('OrderedList.DragHandle');
  const disabled = readonly || !canDrag;
  if (asChild) {
    return (
      <ark.div asChild data-disabled={disabled ? '' : undefined} ref={disabled ? undefined : handleRef}>
        {children}
      </ark.div>
    );
  }

  return <DragHandle.DragHandle disabled={disabled} onMove={(direction) => move(id, direction)} ref={handleRef} />;
};

OrderedListDragHandle.displayName = 'OrderedList.DragHandle';

/**
 * Reorderable list on `Listbox`, sharing its row vocabulary: rows are `Item`s composed from a `DragHandle`,
 * `ItemIcon`, `ItemText` and trailing controls; a collapsible `Item` adds a caret and a `Detail`. The ARIA grid keyboard
 * enters a row with ArrowRight, where the DragHandle moves it with Alt+ArrowUp/Down.
 *
 * @example
 *   <OrderedList.Root items={items} getLabel={(item) => item.label} onMove={move}>
 *     {({ items }) => (
 *       <OrderedList.Content>
 *         {items.map((item) => (
 *           <OrderedList.Item key={item.id} id={item.id}>
 *             <OrderedList.DragHandle />
 *             <OrderedList.ItemText />
 *           </OrderedList.Item>
 *         ))}
 *       </OrderedList.Content>
 *     )}
 *   </OrderedList.Root>
 */
export const OrderedList: {
  Root: typeof OrderedListRoot;
  Label: typeof Listbox.Label;
  Content: typeof OrderedListContent;
  Empty: typeof Listbox.Empty;
  Item: typeof OrderedListItem;
  Detail: typeof OrderedListDetail;
  DragHandle: typeof OrderedListDragHandle;
  ItemIcon: typeof Listbox.ItemIcon;
  ItemText: typeof Listbox.ItemText;
  ItemDescription: typeof Listbox.ItemDescription;
} = {
  Root: OrderedListRoot,
  Label: Listbox.Label,
  Content: OrderedListContent,
  Empty: Listbox.Empty,
  Item: OrderedListItem,
  Detail: OrderedListDetail,
  DragHandle: OrderedListDragHandle,
  ItemIcon: Listbox.ItemIcon,
  ItemText: Listbox.ItemText,
  ItemDescription: Listbox.ItemDescription,
};

export type {
  OrderedListContentProps,
  OrderedListDetailProps,
  OrderedListDragHandleProps,
  OrderedListItemProps,
  OrderedListRootProps,
};
