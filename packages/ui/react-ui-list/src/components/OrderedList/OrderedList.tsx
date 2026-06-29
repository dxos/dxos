//
// Copyright 2026 DXOS.org
//

import {
  type OrderedListDetailItemProps,
  type OrderedListItemProps,
  OrderedListDeleteButton,
  OrderedListDetailItem,
  OrderedListDragHandle,
  OrderedListExpandCaret,
  OrderedListIconButton,
  OrderedListItem,
  OrderedListTitle,
} from './OrderedListItem';
import {
  type OrderedListRootProps,
  type OrderedListViewportProps,
  OrderedListContent,
  OrderedListRoot,
  OrderedListViewport,
} from './OrderedListRoot';

/**
 * Reorderable, single-expandable master-detail list.
 *
 * `DetailItem` encapsulates the common master-detail row (drag handle + bordered column with a
 * name row that toggles an inline detail panel + a trailing action). Compose the lower-level
 * `Item` / `DragHandle` / `Title` / `ExpandCaret` / `DeleteButton` directly for other layouts.
 *
 * @example
 *   <OrderedList.Root items={…} isItem={…} getId={…} onMove={…} expandedId={…} onExpandedChange={…}>
 *     {({ items }) => (
 *       <OrderedList.Content>
 *         {items.map((item) => (
 *           <OrderedList.DetailItem
 *             key={item.id}
 *             id={item.id}
 *             item={item}
 *             title={item.label}
 *             trailing={<OrderedList.DeleteButton onClick={…} />}
 *           >
 *             {detail}
 *           </OrderedList.DetailItem>
 *         ))}
 *       </OrderedList.Content>
 *     )}
 *   </OrderedList.Root>
 */
export const OrderedList = {
  Root: OrderedListRoot,
  Viewport: OrderedListViewport,
  Content: OrderedListContent,
  Item: OrderedListItem,
  DetailItem: OrderedListDetailItem,
  DragHandle: OrderedListDragHandle,
  Title: OrderedListTitle,
  IconButton: OrderedListIconButton,
  DeleteButton: OrderedListDeleteButton,
  ExpandCaret: OrderedListExpandCaret,
};

export type { OrderedListDetailItemProps, OrderedListItemProps, OrderedListRootProps, OrderedListViewportProps };
