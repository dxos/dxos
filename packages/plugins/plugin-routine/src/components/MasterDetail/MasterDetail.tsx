//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback } from 'react';

import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

// Prototype master-detail layout, candidate to push down into @dxos/react-ui-list as a reusable
// component. Presentation-only: a selectable list (master) on top of a single detail pane, with an
// optional create affordance and empty state. The parent owns the detail content (the selected item's
// form, a draft form, etc.) and the selection state.

export type MasterDetailRecord = { id: string };

export type MasterDetailProps<T extends MasterDetailRecord> = ThemedClassName<{
  items: readonly T[];
  /** Currently highlighted row; `undefined` clears the selection (e.g. while a draft is active). */
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
  onDelete?: (item: T) => void;
  /** Row label content. */
  getLabel: (item: T) => ReactNode;
  /** Optional Phosphor icon name shown at the start of each row. */
  getIcon?: (item: T) => string;
  /** Create affordance rendered in the header; omitted when not provided. */
  onCreate?: () => void;
  createLabel?: string;
  /** Message shown when there are no items. */
  emptyLabel?: string;
  /** Detail pane content (selected item's form, draft form, …); rendered below the list. */
  detail?: ReactNode;
}>;

/** Selectable master list (with optional create/delete affordances) above a parent-supplied detail pane. */
export const MasterDetail = <T extends MasterDetailRecord>({
  classNames,
  items,
  selectedId,
  onSelect,
  onDelete,
  getLabel,
  getIcon,
  onCreate,
  createLabel,
  emptyLabel,
  detail,
}: MasterDetailProps<T>) => {
  return (
    <div role='none' className={mx('flex flex-col min-bs-0', classNames)}>
      {(onCreate || emptyLabel) && (
        <div role='none' className='flex items-center min-bs-[--dx-rail-item] pis-2'>
          <span className='grow truncate text-sm text-description'>{items.length === 0 ? emptyLabel : null}</span>
          {onCreate && createLabel && (
            <IconButton variant='ghost' icon='ph--plus--regular' iconOnly label={createLabel} onClick={onCreate} />
          )}
        </div>
      )}

      {items.length > 0 && (
        <OrderedList.Root<T> items={items}>
          {({ items }) => (
            <OrderedList.Content>
              {items.map((item) => (
                <MasterDetailRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  label={getLabel(item)}
                  icon={getIcon?.(item)}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
      )}

      {detail && (
        <div role='none' className='flex flex-col min-bs-0 border-bs border-subdued-separator'>
          {detail}
        </div>
      )}
    </div>
  );
};

const MasterDetailRow = <T extends MasterDetailRecord>({
  item,
  selected,
  label,
  icon,
  onSelect,
  onDelete,
}: {
  item: T;
  selected: boolean;
  label: ReactNode;
  icon?: string;
  onSelect?: (id: string | undefined) => void;
  onDelete?: (item: T) => void;
}) => {
  const handleDelete = useCallback(() => onDelete?.(item), [onDelete, item]);
  return (
    <OrderedList.Item
      id={item.id}
      item={item}
      canDrag={false}
      hover
      selected={selected}
      classNames='flex items-center cursor-pointer pis-2 min-bs-[--dx-rail-item]'
      onClick={() => onSelect?.(selected ? undefined : item.id)}
    >
      {icon && <Icon icon={icon} size={4} classNames='mie-2 shrink-0' />}
      <span className='grow truncate'>{label}</span>
      {onDelete && (
        <OrderedList.DeleteButton
          autoHide
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
        />
      )}
    </OrderedList.Item>
  );
};
