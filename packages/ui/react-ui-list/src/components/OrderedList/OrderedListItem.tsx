//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentProps, type PropsWithChildren, useCallback } from 'react';

import { type IconButtonProps, type ThemedClassName, ToggleIconButton, useTranslation } from '@dxos/react-ui';
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
    /** Apply the row-hover affordance. Defaults to false. */
    hover?: boolean;
  }>
>;

/** A single reorderable item. Wraps `List.Item` and provides per-item expand context. */
export const OrderedListItem = <T extends ListItemRecord>({
  id,
  item,
  canDrag = true,
  hover = false,
  classNames,
  children,
}: OrderedListItemProps<T>) => {
  const { expandedId, setExpanded } = useOrderedListContext(ORDERED_LIST_ITEM_NAME);
  const expanded = expandedId === id;
  const toggle = useCallback(() => setExpanded(expanded ? undefined : id), [expanded, id, setExpanded]);

  return (
    <OrderedListItemProvider id={id} expanded={expanded} toggle={toggle} canDrag={canDrag}>
      {/* Disclosure state lives on the controlling caret button (aria-expanded/aria-controls),
          not the row container, so the row stays neutral for non-expandable lists. */}
      <List.Item<T> item={item} hover={hover} classNames={mx('flex flex-col', classNames)}>
        {children}
      </List.Item>
    </OrderedListItemProvider>
  );
};

/** Flex row holding the handle / title / actions / caret. `Expanded` is its sibling. */
export const OrderedListRow = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx('flex items-center gap-1 rounded-xs cursor-pointer min-h-10', classNames)}>{children}</div>
);

/** Drag handle. Disabled when the list is readonly or the item opts out via `canDrag={false}`. */
export const OrderedListDragHandle = () => {
  const { readonly } = useOrderedListContext('OrderedListDragHandle');
  const { canDrag } = useOrderedListItemContext('OrderedListDragHandle');
  return <List.ItemDragHandle disabled={readonly || !canDrag} noTooltip />;
};

/** Clickable title; clicking toggles the item's expanded state. */
export const OrderedListTitle = ({
  classNames,
  children,
  ...props
}: ThemedClassName<PropsWithChildren<ComponentProps<'div'>>>) => {
  const { id, toggle } = useOrderedListItemContext('OrderedListTitle');
  // The title carries a stable id so the expanded panel can name itself via `aria-labelledby`.
  return (
    <List.ItemTitle id={`${id}-title`} classNames={classNames} onClick={toggle} {...props}>
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
  const { id, expanded, toggle } = useOrderedListItemContext('OrderedListExpandCaret');
  // Disclosure semantics: this button controls the expanded panel so assistive tech can
  // announce the open/closed state and navigate to the controlled region.
  return (
    <ToggleIconButton
      iconOnly
      variant='ghost'
      active={expanded}
      icon='ph--caret-right--regular'
      label={t('toggle-expand.label')}
      aria-expanded={expanded}
      aria-controls={`${id}-panel`}
      onClick={toggle}
      {...props}
    />
  );
};

/** Expanded detail panel. Renders inside a bordered wrapper only when the item is expanded. */
export const OrderedListExpanded = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  const { id, expanded } = useOrderedListItemContext('OrderedListExpanded');
  if (!expanded) {
    return null;
  }
  // The panel is a region named by its title so it is reachable and labelled for assistive tech.
  return (
    <div
      role='region'
      id={`${id}-panel`}
      aria-labelledby={`${id}-title`}
      className={mx('border border-separator rounded-md', classNames)}
    >
      {children}
    </div>
  );
};
