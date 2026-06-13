//
// Copyright 2026 DXOS.org
//

import {
  OrderedListDeleteButton,
  OrderedListDetailItem,
  type OrderedListDetailItemProps,
  OrderedListDragHandle,
  OrderedListExpandCaret,
  OrderedListItem,
  type OrderedListItemProps,
  OrderedListTitle,
} from './OrderedListItem';
import { OrderedListContent, OrderedListRoot, type OrderedListRootProps } from './OrderedListRoot';

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
  Content: OrderedListContent,
  Item: OrderedListItem,
  DetailItem: OrderedListDetailItem,
  DragHandle: OrderedListDragHandle,
  Title: OrderedListTitle,
  DeleteButton: OrderedListDeleteButton,
  ExpandCaret: OrderedListExpandCaret,
};

export type { OrderedListRootProps, OrderedListItemProps, OrderedListDetailItemProps };
