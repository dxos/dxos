//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';

/**
 * A record as the views show it: `Listbox.Root` reads `value`, `label`, `description` and `icon`,
 * while a card lays `fields` out as one row each.
 */
export type Entry = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  fields?: { icon: string; value: string }[];
};

/**
 * The master list: one row per record.
 *
 * `Listbox` owns selection, the keyboard cursor and hover highlighting — `dx-current` / `dx-selected` come from
 * zag's state, so nothing here sets a class per row. `Listbox.Viewport` is also its scroller, which is why there
 * is no ScrollArea around it: two scrollers of equal height means neither scrolls.
 */
export const ListView = ({
  entries,
  selected,
  onSelect,
  onRemove,
  classNames,
}: {
  entries: readonly Entry[];
  selected?: string;
  onSelect?: (id?: string) => void;
  onRemove?: (id: string) => void;
  classNames?: string;
}) => (
  <Listbox.Root
    items={[...entries]}
    // The empty string is no row: controlled, so the selection is the app's and survives a view change.
    value={selected ?? ''}
    onValueChange={onSelect}
    onDeselect={() => onSelect?.(undefined)}
    selectionStyle='outline'
    classNames={['min-h-0', classNames]}
  >
    <Listbox.Viewport>
      <Listbox.Content>
        {entries.map((entry) => (
          <Listbox.Item key={entry.value} id={entry.value} highlightOnHover>
            {entry.icon && <Listbox.ItemIcon />}
            <Listbox.ItemText />
            {onRemove && (
              <Button.Root
                iconOnly
                icon='ph--x--regular'
                variant='ghost'
                label='Remove'
                onClick={() => onRemove(entry.value)}
              />
            )}
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
    <Listbox.Empty icon='ph--database--regular'>Nothing here yet — generate a graph, or create a record.</Listbox.Empty>
  </Listbox.Root>
);
