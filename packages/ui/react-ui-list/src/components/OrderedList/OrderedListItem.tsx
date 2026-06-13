//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentProps, type PropsWithChildren, useCallback } from 'react';

import { type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx, osTranslations } from '@dxos/ui-theme';

import { List, type ListItemRecord } from '../List';
import { useOrderedListContext } from './OrderedListRoot';

const ORDERED_LIST_ITEM_NAME = 'OrderedListItem';

type OrderedListItemContextValue = {
  id: string;
  expanded: boolean;
  toggle: () => void;
  canDrag: boolean;
};

const [OrderedListItemProvider, useOrderedListItemContext] =
  createContext<OrderedListItemContextValue>(ORDERED_LIST_ITEM_NAME);

export type OrderedListItemProps<T extends ListItemRecord> = ThemedClassName<
  PropsWithChildren<{
    id: string;
    /** The record handed to the underlying `List.Item` for DnD. */
    item: T;
    /** Defaults to true; false disables the drag handle. */
    canDrag?: boolean;
  }>
>;

/** A single reorderable item. Wraps `List.Item` and provides per-item expand context. */
export const OrderedListItem = <T extends ListItemRecord>({
  id,
  item,
  canDrag = true,
  classNames,
  children,
}: OrderedListItemProps<T>) => {
  const { expandedId, setExpanded } = useOrderedListContext(ORDERED_LIST_ITEM_NAME);
  const expanded = expandedId === id;
  const toggle = useCallback(() => setExpanded(expanded ? undefined : id), [expanded, id, setExpanded]);

  return (
    <OrderedListItemProvider id={id} expanded={expanded} toggle={toggle} canDrag={canDrag}>
      <List.Item<T> item={item} aria-expanded={expanded} classNames={mx('flex flex-col', classNames)}>
        {children}
      </List.Item>
    </OrderedListItemProvider>
  );
};

/** Flex row holding the handle / title / actions / caret. `Expanded` is its sibling. */
export const OrderedListRow = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx('flex items-center gap-1 dx-hover rounded-xs cursor-pointer min-h-10', classNames)}>
    {children}
  </div>
);

/** Drag handle. Disabled when the list is readonly or the item opts out via `canDrag={false}`. */
export const OrderedListDragHandle = () => {
  const { readonly } = useOrderedListContext('OrderedListDragHandle');
  const { canDrag } = useOrderedListItemContext('OrderedListDragHandle');
  return <List.ItemDragHandle disabled={readonly || !canDrag} />;
};

/** Clickable title; clicking toggles the item's expanded state. */
export const OrderedListTitle = ({
  classNames,
  children,
  ...props
}: ThemedClassName<PropsWithChildren<ComponentProps<'div'>>>) => {
  const { toggle } = useOrderedListItemContext('OrderedListTitle');
  return (
    <List.ItemTitle classNames={classNames} onClick={toggle} {...props}>
      {children}
    </List.ItemTitle>
  );
};

/** Generic per-row action icon button (e.g. hide/show eye). */
export const OrderedListAction = ({ autoHide = false, ...props }: IconButtonProps & { autoHide?: boolean }) => (
  <List.ItemIconButton autoHide={autoHide} {...props} />
);

/** Delete icon button. */
export const OrderedListDeleteButton = ({
  autoHide = false,
  ...props
}: Partial<Pick<IconButtonProps, 'icon'>> &
  Omit<IconButtonProps, 'icon' | 'label'> & { autoHide?: boolean; label?: string }) => (
  <List.ItemDeleteButton autoHide={autoHide} {...props} />
);

/** Expand/collapse caret; reflects and toggles the item's expanded state. */
export const OrderedListExpandCaret = (props: Partial<IconButtonProps>) => {
  const { t } = useTranslation(osTranslations);
  const { expanded, toggle } = useOrderedListItemContext('OrderedListExpandCaret');
  return (
    <List.ItemIconButton
      iconOnly
      variant='ghost'
      autoHide={false}
      label={t('toggle-expand.label')}
      icon={expanded ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
      onClick={toggle}
      {...props}
    />
  );
};

/** Expanded detail panel. Renders inside a bordered wrapper only when the item is expanded. */
export const OrderedListExpanded = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  const { expanded } = useOrderedListItemContext('OrderedListExpanded');
  if (!expanded) {
    return null;
  }
  return <div className={mx('border border-separator rounded-md', classNames)}>{children}</div>;
};
