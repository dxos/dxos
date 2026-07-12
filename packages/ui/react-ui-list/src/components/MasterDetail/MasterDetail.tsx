//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { type ReactNode, useMemo } from 'react';

import { Column, Icon, IconBlock, Panel, ScrollArea, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { getStyles, mx } from '@dxos/ui-theme';

import { Empty } from '../Empty';
import { OrderedList } from '../OrderedList';

// Presentation-only master-detail layout: a selectable list (master) above a single detail pane, with
// an optional empty state. The parent owns the detail content (the selected item's form/preview) and
// the selection state. Nest by placing another `MasterDetail` in the `detail` slot. Per-row actions
// (e.g. an overflow menu) are supplied via `renderActions` so this primitive stays menu-agnostic.

export type MasterDetailRecord = { id: string };

/** A row's leading icon: same shape as `Obj.getIcon` — a Phosphor icon name and an optional hue. */
export type MasterDetailIcon = { icon: string; hue?: string };

/** A row's trailing adornment: a status icon with a tooltip label (e.g. a 'mapped' or warning badge). */
export type MasterDetailAdornment = { icon: string; label: string };

export type MasterDetailProps<T extends MasterDetailRecord> = ThemedClassName<{
  items: readonly T[];
  /** Currently highlighted row; `undefined` clears the selection. */
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
  /**
   * Build the row's label reactively. Run inside an atom so it can subscribe to the item's state via `get`
   * (e.g. the object's name) and update live when it changes.
   */
  getLabel: (get: Atom.Context, item: T) => string;
  /** Build the row's leading icon reactively (colour by state, etc.); `undefined` for none. */
  getIcon?: (get: Atom.Context, item: T) => MasterDetailIcon | undefined;
  /** Build the row's trailing adornment reactively (e.g. a status badge); `undefined` for none. */
  getAdornment?: (get: Atom.Context, item: T) => MasterDetailAdornment | undefined;
  /** Render trailing per-row actions (e.g. an overflow menu). The parent owns the menu system. */
  renderActions?: (item: T) => ReactNode;
  /** Message shown when there are no items. */
  emptyLabel?: string;
  /**
   * Layout of the master list relative to the detail pane. `vertical` (default) stacks the list above
   * the detail (aligned to the surface column system); `horizontal` places the list and detail
   * side-by-side as columns.
   */
  orientation?: 'vertical' | 'horizontal';
  /** Detail pane content (selected item's form/preview, or a nested `MasterDetail`). */
  detail?: ReactNode;
}>;

/** Selectable master list (with optional per-row actions) above a parent-supplied detail pane. */
export const MasterDetail = <T extends MasterDetailRecord>({
  classNames,
  items,
  selectedId,
  onSelect,
  getLabel,
  getIcon,
  getAdornment,
  renderActions,
  emptyLabel,
  orientation = 'vertical',
  detail,
}: MasterDetailProps<T>) => {
  const list = (items.length === 0 && <Empty label={emptyLabel} />) || (
    <OrderedList.Root<T> items={items}>
      {({ items }) => (
        <OrderedList.Content>
          {items.map((item) => (
            <MasterDetailRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              getLabel={getLabel}
              getIcon={getIcon}
              getAdornment={getAdornment}
              renderActions={renderActions}
              onSelect={onSelect}
            />
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );

  if (orientation === 'horizontal') {
    // List and detail as side-by-side `Panel` panes. The master sizes to its content (`w-max`) capped at
    // `max-w-xs` so long labels don't dominate; the detail takes the remaining width. The master list
    // scrolls within its own pane; the detail pane is a bounded flex column that its content fills (a
    // nested `MasterDetail`, or content that scrolls itself) — so nesting does not stack scroll regions.
    // `overflow-hidden` is required: a flex item only shrinks below its content's height (letting the
    // inner scroll areas engage) when its overflow is not `visible`. The caller makes this row fill its
    // parent (`flex-1 min-bs-0`).
    return (
      <div role='none' className={mx('flex gap-2 min-bs-0 overflow-hidden', classNames)}>
        <Panel.Root classNames='shrink-0 w-max max-w-xs'>
          <Panel.Content asChild>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport>{list}</ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Content>
        </Panel.Root>
        <Panel.Root classNames='flex-1 min-w-0'>
          <Panel.Content classNames='flex flex-col min-bs-0'>{detail}</Panel.Content>
        </Panel.Root>
      </div>
    );
  }

  // The gutter is owned by a `Column.Root` so the list aligns to the surface's column system: rows and
  // their selection highlight sit in the centre track, matching the detail's inset.
  return (
    <Column.Root gutter='sm' classNames={classNames}>
      <Column.Center>{list}</Column.Center>
      <div className='col-span-full pt-trim-md'>{detail}</div>
    </Column.Root>
  );
};

type MasterDetailRowProps<T extends MasterDetailRecord> = {
  item: T;
  selected: boolean;
  getLabel: (get: Atom.Context, item: T) => string;
  getIcon?: (get: Atom.Context, item: T) => MasterDetailIcon | undefined;
  getAdornment?: (get: Atom.Context, item: T) => MasterDetailAdornment | undefined;
  renderActions?: (item: T) => ReactNode;
  onSelect?: (id: string | undefined) => void;
};

const MasterDetailRow = <T extends MasterDetailRecord>({
  item,
  selected,
  getLabel,
  getIcon,
  getAdornment,
  renderActions,
  onSelect,
}: MasterDetailRowProps<T>) => {
  // Resolve the label, icon, and adornment reactively per row — each subscribes (via `get`) only to this
  // item's state, so a change updates just this row.
  const label = useAtomValue(useMemo(() => Atom.make((get) => getLabel(get, item)), [getLabel, item]));
  const icon = useAtomValue(useMemo(() => Atom.make((get) => getIcon?.(get, item)), [getIcon, item]));
  const adornment = useAtomValue(useMemo(() => Atom.make((get) => getAdornment?.(get, item)), [getAdornment, item]));

  return (
    <OrderedList.Item
      id={item.id}
      item={item}
      canDrag={false}
      hover
      selected={selected}
      classNames='flex items-center cursor-pointer p-1'
      onClick={() => onSelect?.(selected ? undefined : item.id)}
    >
      {icon && (
        <IconBlock>
          <Icon icon={icon.icon} classNames={icon.hue ? getStyles(icon.hue).text : undefined} />
        </IconBlock>
      )}
      <span className='grow truncate'>{label}</span>
      {adornment && (
        <Tooltip.Provider>
          <Tooltip.Trigger asChild side='bottom' content={adornment.label}>
            <Icon icon={adornment.icon} />
          </Tooltip.Trigger>
        </Tooltip.Provider>
      )}
      {renderActions?.(item)}
    </OrderedList.Item>
  );
};
