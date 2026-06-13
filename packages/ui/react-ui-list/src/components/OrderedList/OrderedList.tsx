//
// Copyright 2026 DXOS.org
//

import { OrderedListContent, OrderedListRoot, type OrderedListRootProps } from './OrderedListRoot';
import {
  OrderedListAction,
  OrderedListDeleteButton,
  OrderedListDragHandle,
  OrderedListExpandCaret,
  OrderedListExpanded,
  OrderedListItem,
  type OrderedListItemProps,
  OrderedListRow,
  OrderedListTitle,
} from './OrderedListItem';

/**
 * Reorderable, single-expandable master-detail list.
 *
 * @example
 *   <OrderedList.Root items={…} isItem={…} getId={…} onMove={…} expandedId={…} onExpandedChange={…}>
 *     {({ items }) => (
 *       <OrderedList.Content>
 *         {items.map((item) => (
 *           <OrderedList.Item key={item.id} id={item.id} item={item}>
 *             <OrderedList.Row>
 *               <OrderedList.DragHandle />
 *               <OrderedList.Title>{item.label}</OrderedList.Title>
 *               <OrderedList.DeleteButton onClick={…} />
 *               <OrderedList.ExpandCaret />
 *             </OrderedList.Row>
 *             <OrderedList.Expanded>…</OrderedList.Expanded>
 *           </OrderedList.Item>
 *         ))}
 *       </OrderedList.Content>
 *     )}
 *   </OrderedList.Root>
 */
export const OrderedList = {
  Root: OrderedListRoot,
  Content: OrderedListContent,
  Item: OrderedListItem,
  Row: OrderedListRow,
  DragHandle: OrderedListDragHandle,
  Title: OrderedListTitle,
  Action: OrderedListAction,
  DeleteButton: OrderedListDeleteButton,
  ExpandCaret: OrderedListExpandCaret,
  Expanded: OrderedListExpanded,
};

export type { OrderedListRootProps, OrderedListItemProps };
