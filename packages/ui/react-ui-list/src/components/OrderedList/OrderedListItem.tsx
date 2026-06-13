//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type PropsWithChildren,
  type ReactNode,
  type RefCallback,
  useCallback,
} from 'react';

import {
  IconBlock,
  IconButton,
  type IconButtonProps,
  ListItem as NaturalListItem,
  type ThemedClassName,
  ToggleIconButton,
  useTranslation,
} from '@dxos/react-ui';
import { mx, osTranslations } from '@dxos/ui-theme';

import { useListGrid, useReorderItem } from '../../aspects';
import { type ListItemRecord, useOrderedListContext } from './OrderedListRoot';

const ORDERED_LIST_ITEM_NAME = 'OrderedListItem';

type OrderedListItemContextValue = {
  id: string;
  expanded: boolean;
  toggle: () => void;
  canDrag: boolean;
  handleRef: RefCallback<HTMLElement>;
  /** ARIA wiring for the controlled disclosure panel. */
  triggerProps: ReturnType<NonNullable<ReturnType<typeof useOrderedListContext>['disclosure']['bind']>>['triggerProps'];
  panelProps: ReturnType<NonNullable<ReturnType<typeof useOrderedListContext>['disclosure']['bind']>>['panelProps'];
};

const [OrderedListItemProvider, useOrderedListItemContext] =
  createContext<OrderedListItemContextValue>(ORDERED_LIST_ITEM_NAME);

export type OrderedListItemProps<T extends ListItemRecord> = ThemedClassName<
  PropsWithChildren<{
    id: string;
    /** The record handed to the underlying reorder hook (kept for back-compat with callers). */
    item: T;
    /** Defaults to true; false disables the drag handle. */
    canDrag?: boolean;
    /** Apply the row-hover affordance. Defaults to false. */
    hover?: boolean;
    /** Inline style merged onto the outer element. Used for grid templates produced by `useListGrid`. */
    style?: CSSProperties;
  }>
>;

/**
 * A single reorderable item. Calls `useReorderItem` to wire pragmatic-dnd refs + state,
 * resolves disclosure state from the root context, and exposes both via item context for
 * the sub-components (`OrderedListDragHandle`, `OrderedListTitle`, `OrderedListExpandCaret`).
 *
 * The outer element applies only structural concerns (`relative` + state classes); the
 * layout (flex/grid) is controlled by the caller via `classNames` so master-detail rows
 * and bare reorderable rows can share the same component.
 */
export const OrderedListItem = <T extends ListItemRecord>({
  id,
  canDrag = true,
  hover = false,
  classNames,
  style,
  children,
}: OrderedListItemProps<T>) => {
  const { reorder, disclosure, navigation } = useOrderedListContext(ORDERED_LIST_ITEM_NAME);
  const { rowRef, handleRef, closestEdge, state } = useReorderItem(reorder, id);
  const { expanded, toggle, triggerProps, panelProps } = disclosure.bind(id);

  return (
    <OrderedListItemProvider
      id={id}
      expanded={expanded}
      toggle={toggle}
      canDrag={canDrag}
      handleRef={handleRef}
      triggerProps={triggerProps}
      panelProps={panelProps}
    >
      <div
        ref={rowRef as RefCallback<HTMLDivElement>}
        {...navigation.itemProps()}
        style={style}
        className={mx(
          'relative dx-selected',
          hover && 'dx-hover',
          state.type === 'dragging' && 'opacity-50',
          classNames,
        )}
      >
        {children}
        {closestEdge && <NaturalListItem.DropIndicator edge={closestEdge} />}
      </div>
    </OrderedListItemProvider>
  );
};

/**
 * Drag handle. Disabled when the list is readonly or the item opts out via `canDrag={false}`.
 * The button is the only element that initiates drag — pragmatic-dnd's `dragHandle:` option
 * scopes the source surface to this ref.
 */
export const OrderedListDragHandle = () => {
  const { readonly } = useOrderedListContext('OrderedListDragHandle');
  const { canDrag, handleRef } = useOrderedListItemContext('OrderedListDragHandle');
  const { t } = useTranslation(osTranslations);
  const disabled = readonly || !canDrag;
  return (
    <IconButton
      variant='ghost'
      disabled={disabled}
      noTooltip
      icon='ph--dots-six-vertical--regular'
      iconOnly
      label={t('drag-handle.label')}
      ref={handleRef as RefCallback<HTMLButtonElement>}
    />
  );
};

/**
 * Clickable title; clicking toggles the item's expanded state. Carries a stable id so the
 * expanded panel can name itself via `aria-labelledby`.
 */
export const OrderedListTitle = ({
  classNames,
  children,
  onClick,
  ...props
}: ThemedClassName<PropsWithChildren<ComponentProps<'div'>>>) => {
  const { triggerProps } = useOrderedListItemContext('OrderedListTitle');
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      triggerProps.onClick(event);
    },
    [onClick, triggerProps],
  );
  return (
    <div
      {...props}
      // The title row is also the disclosure trigger, so it carries the trigger's
      // `id` + `aria-expanded` + `aria-controls` for assistive tech.
      id={triggerProps.id}
      aria-expanded={triggerProps['aria-expanded']}
      aria-controls={triggerProps['aria-controls']}
      className={mx('flex grow items-center truncate cursor-pointer', classNames)}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

/**
 * Delete icon button. Anchored in a `var(--dx-rail-item)` IconBlock so it shares a centerline
 * with the title row regardless of expand state. No `my-[1px]` nudge: the central column's
 * outline is `ring-1` (see `OrderedListDetailItem`) so layout is exact.
 */
export const OrderedListDeleteButton = ({
  autoHide = false,
  icon = 'ph--x--regular',
  label,
  disabled,
  classNames,
  ...props
}: Partial<Pick<IconButtonProps, 'icon'>> &
  Omit<IconButtonProps, 'icon' | 'label'> & { autoHide?: boolean; label?: string }) => {
  const { t } = useTranslation(osTranslations);
  return (
    <IconBlock>
      <IconButton
        {...props}
        variant='ghost'
        disabled={disabled}
        icon={icon}
        iconOnly
        label={label ?? t('delete.label')}
        classNames={[classNames, autoHide && disabled && 'hidden']}
      />
    </IconBlock>
  );
};

/**
 * Expand/collapse caret; reflects and toggles the item's expanded state via the disclosure
 * trigger's `aria-expanded` + `aria-controls`.
 */
export const OrderedListExpandCaret = ({ onClick, ...props }: Partial<IconButtonProps>) => {
  const { t } = useTranslation(osTranslations);
  const { expanded, toggle, triggerProps } = useOrderedListItemContext('OrderedListExpandCaret');
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      toggle();
      onClick?.(event);
    },
    [toggle, onClick],
  );
  return (
    <ToggleIconButton
      iconOnly
      variant='ghost'
      active={expanded}
      icon='ph--caret-right--regular'
      label={t('toggle-expand.label')}
      // Disclosure semantics are carried here for AT users that interact with the caret
      // rather than the title.
      aria-expanded={triggerProps['aria-expanded']}
      aria-controls={triggerProps['aria-controls']}
      onClick={handleClick}
      {...props}
    />
  );
};

export type OrderedListDetailItemProps<T extends ListItemRecord> = ThemedClassName<
  PropsWithChildren<{
    id: string;
    /** The record handed to the underlying reorder hook (kept for back-compat with callers). */
    item: T;
    /** Defaults to true; false disables the drag handle. */
    canDrag?: boolean;
    /** Title content shown in the clickable name row (clicking toggles expansion). */
    title: ReactNode;
    titleClassNames?: ThemedClassName<any>['classNames'];
    /** Inline actions placed in the name row before the expand caret (e.g. a visibility toggle). */
    actions?: ReactNode;
    /** Action(s) placed outside the bordered column, flanking it (e.g. a delete button). */
    trailing?: ReactNode;
    /** When false, hides the expand caret and detail panel. Defaults to true. */
    expandable?: boolean;
  }>
>;

/**
 * Master-detail row: a drag handle and trailing action flank a `ring-1`-outlined central
 * column whose title row (title + inline actions + expand caret) toggles an inline detail
 * panel (children).
 *
 * Outline uses `ring-1` (rendered as box-shadow) rather than `border` so the column's
 * content area is the full `var(--dx-rail-item)` height — handles, title, caret, and
 * trailing all sit on the same baseline without per-pixel nudges.
 */
export const OrderedListDetailItem = <T extends ListItemRecord>({
  id,
  item,
  canDrag,
  title,
  titleClassNames,
  actions,
  trailing,
  expandable = true,
  classNames,
  children,
}: OrderedListDetailItemProps<T>) => {
  const grid = useListGrid({ trailing: !!trailing });
  return (
    <OrderedListItem
      id={id}
      item={item}
      canDrag={canDrag}
      // The grid template is inline so the row's three slots (handle / card / trailing)
      // land in fixed-width tracks that share a baseline with the title row inside the card.
      // See useListGrid for the rationale.
      style={grid.rowProps.style}
      classNames={mx(grid.rowProps.className, 'pb-1', classNames)}
    >
      <OrderedListDragHandle />
      <div className='flex flex-col ring-1 ring-subdued-separator rounded-sm overflow-hidden'>
        <div className='flex items-center min-h-[var(--dx-rail-item)]'>
          {expandable ? (
            <OrderedListTitle classNames={mx('px-2', titleClassNames)}>{title}</OrderedListTitle>
          ) : (
            // When the row is not expandable, render a plain (non-toggling) title so a click
            // doesn't mutate hidden disclosure state. Mirrors `OrderedListTitle`'s structure
            // minus the trigger plumbing.
            <div className={mx('flex grow items-center truncate px-2', titleClassNames)}>{title}</div>
          )}
          {actions}
          {expandable && <OrderedListExpandCaret />}
        </div>
        {expandable && <DetailPanel>{children}</DetailPanel>}
      </div>
      {trailing}
    </OrderedListItem>
  );
};

/**
 * Read-only panel renderer that consumes the item's disclosure state from context. Kept as
 * a small sub-component so the panel's `id` + `role=region` + `aria-labelledby` come from a
 * single source — and so a closed item doesn't pay for rendering an empty panel.
 */
const DetailPanel = ({ children }: PropsWithChildren) => {
  const { expanded, panelProps } = useOrderedListItemContext('OrderedListDetailItem.Panel');
  if (!expanded || !children) {
    return null;
  }
  return (
    <div {...panelProps} className='px-2 pb-2'>
      {children}
    </div>
  );
};
