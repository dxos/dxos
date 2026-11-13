//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';

/**
 * A record as a row: `Listbox` reads `value`, `label`, `description` and
 * `icon`.
 */
export type Entry = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
};

export type RecordListProps = {
  entries: readonly Entry[];
  selected?: string;
  onSelect: (id?: string) => void;
  /** Shows a remove button on each row when given. */
  onRemove?: (id: string) => void;
};

/** One row per record; selecting a row opens it in the form. */
export const RecordList = ({
  entries,
  selected,
  onSelect,
  onRemove,
}: RecordListProps) => (
  <Listbox.Root
    items={[...entries]}
    value={selected ?? ''}
    onValueChange={onSelect}
    onDeselect={() => onSelect(undefined)}
    selectionStyle='outline'
    classNames='min-h-0'
  >
    <Listbox.Viewport>
      <Listbox.Content>
        {entries.map((entry) => (
          <Listbox.Item key={entry.value} id={entry.value} highlightOnHover>
            {entry.icon && <Listbox.ItemIcon />}
            <Listbox.ItemText />
            {entry.description && <Listbox.ItemDescription />}
            {onRemove && (
              <Button.Root
                iconOnly
                icon='ph--x--regular'
                variant='ghost'
                label='Remove'
                onClick={(event) => {
                  // The row selects on click, so removing a record must not
                  // reach it.
                  event.stopPropagation();
                  onRemove(entry.value);
                }}
              />
            )}
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
    <Listbox.Empty icon='ph--database--regular'>No records</Listbox.Empty>
  </Listbox.Root>
);
