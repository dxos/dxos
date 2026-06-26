//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { type ReactNode, useMemo } from 'react';

import { Column, Icon, IconBlock, IconButton, type ThemedClassName, Tooltip, useTranslation } from '@dxos/react-ui';
import { Empty, OrderedList } from '@dxos/react-ui-list';
import { Menu, type ActionGraphProps, useMenuBuilder } from '@dxos/react-ui-menu';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';

// Prototype master-detail layout, candidate to push down into @dxos/react-ui-list as a reusable
// component. Presentation-only: a selectable list (master) on top of a single detail pane, with an
// optional empty state. The parent owns the detail content (the selected item's form, a draft form,
// etc.) and the selection state.

export type MasterDetailRecord = { id: string };

/** A row's leading icon: same shape as {@link Obj.getIcon} — a Phosphor icon name and an optional hue. */
export type MasterDetailIcon = { icon: string; hue?: string };

/** A row's trailing adornment: a status icon with a tooltip label (e.g. a 'detached' warning badge). */
export type MasterDetailAdornment = { icon: string; label: string };

const EMPTY_MENU: ActionGraphProps = { nodes: [], edges: [] };

export type MasterDetailProps<T extends MasterDetailRecord> = ThemedClassName<{
  items: readonly T[];
  /** Currently highlighted row; `undefined` clears the selection (e.g. while a draft is active). */
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
  /**
   * Build the row's label reactively. Run inside an atom so it can subscribe to the item's state via `get`
   * (e.g. the object's name) and update live when it changes.
   */
  getLabel: (get: Atom.Context, item: T) => string;
  /**
   * Build the row's leading icon reactively. Run inside an atom so it can subscribe to the item's state via
   * `get` (e.g. colour the icon by an `enabled` flag); returns the icon name and optional colour classes.
   */
  getIcon?: (get: Atom.Context, item: T) => MasterDetailIcon | undefined;
  /**
   * Build the row's trailing adornment reactively (e.g. a status badge). Run inside an atom so it can subscribe
   * to the item's state via `get`; returns a Phosphor icon name and a tooltip label, or `undefined` for none.
   */
  getAdornment?: (get: Atom.Context, item: T) => MasterDetailAdornment | undefined;
  /**
   * Build the per-row overflow (three-dots) menu. Run inside each row's `useMenuBuilder`, so it should
   * subscribe to that item's reactive state via `get` (e.g. an `enabled` flag) — the menu then updates live
   * without re-rendering the whole list.
   */
  getMenu?: (get: Atom.Context, item: T) => ActionGraphProps;
  /** Message shown when there are no items. */
  emptyLabel?: string;
  /** Detail pane content (selected item's form, draft form, …); rendered below the list. */
  detail?: ReactNode;
}>;

/** Selectable master list (with an optional per-row overflow menu) above a parent-supplied detail pane. */
export const MasterDetail = <T extends MasterDetailRecord>({
  classNames,
  items,
  selectedId,
  onSelect,
  getLabel,
  getIcon,
  getAdornment,
  getMenu,
  emptyLabel,
  detail,
}: MasterDetailProps<T>) => {
  // The gutter is owned by a `Column.Root` (not an ad-hoc wrapper) so the list aligns to the surface's
  // column system: rows and their selection highlight sit in the centre track (`Column.Center`), matching
  // the inset of the detail's form. The detail bleeds the full width since its own `Form` owns its gutter.
  return (
    <Column.Root gutter='sm' classNames={classNames}>
      <Column.Center>
        {(items.length === 0 && <Empty label={emptyLabel} />) || (
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
                    getMenu={getMenu}
                    onSelect={onSelect}
                  />
                ))}
              </OrderedList.Content>
            )}
          </OrderedList.Root>
        )}
      </Column.Center>

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
  getMenu?: (get: Atom.Context, item: T) => ActionGraphProps;
  onSelect?: (id: string | undefined) => void;
};

const MasterDetailRow = <T extends MasterDetailRecord>({
  item,
  selected,
  getLabel,
  getIcon,
  getAdornment,
  getMenu,
  onSelect,
}: MasterDetailRowProps<T>) => {
  const { t } = useTranslation(meta.profile.key);
  // Resolve the label, icon, adornment, and actions reactively per row — each subscribes (via `get`) only to
  // this item's state, so a change (rename, toggling enabled) updates just this row.
  const label = useAtomValue(useMemo(() => Atom.make((get) => getLabel(get, item)), [getLabel, item]));
  const icon = useAtomValue(useMemo(() => Atom.make((get) => getIcon?.(get, item)), [getIcon, item]));
  const adornment = useAtomValue(useMemo(() => Atom.make((get) => getAdornment?.(get, item)), [getAdornment, item]));
  const menu = useMenuBuilder((get) => getMenu?.(get, item) ?? EMPTY_MENU, [getMenu, item]);

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
      {getMenu && (
        <Menu.Root {...menu}>
          <Menu.Trigger asChild>
            <IconButton
              iconOnly
              variant='ghost'
              icon='ph--dots-three-vertical--regular'
              label={t('routine-actions.label')}
              // Open the menu without toggling row selection.
              onClick={(event) => event.stopPropagation()}
            />
          </Menu.Trigger>
          <Menu.Content />
        </Menu.Root>
      )}
    </OrderedList.Item>
  );
};
