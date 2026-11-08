//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';

/** A row, in the shape `Listbox.Root` takes: the parts read `label`, `description` and `icon` from it. */
export type Entry = { value: string; label: string; description?: string; icon?: string };

/**
 * The master list: rows, or — with `tileWidth` — a reflowing grid of Cards.
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
  tileWidth,
  classNames,
}: {
  entries: readonly Entry[];
  selected?: string;
  onSelect?: (id?: string) => void;
  onRemove?: (id: string) => void;
  /** Lays the rows out as tiles this many pixels wide at the minimum (the cards view). */
  tileWidth?: { min: number; max?: number };
  classNames?: string;
}) => (
  <Listbox.Root
    items={[...entries]}
    // The empty string is no row: controlled, so the selection is the app's and survives a view change.
    value={selected ?? ''}
    onValueChange={onSelect}
    onDeselect={() => onSelect?.(undefined)}
    selectionStyle='outline'
    tileWidth={tileWidth}
    classNames={['min-h-0', classNames]}
  >
    <Listbox.Viewport>
      <Listbox.Content>
        {entries.map((entry) =>
          tileWidth ? (
            <Listbox.Item key={entry.value} id={entry.value} highlightOnHover classNames='p-0'>
              <Card.Root border selected={entry.value === selected}>
                <Card.Header>
                  <Card.Title truncate>{entry.label}</Card.Title>
                </Card.Header>
                {entry.description && (
                  <Card.Row>
                    <Card.Text variant='muted' lines={2}>
                      {entry.description}
                    </Card.Text>
                  </Card.Row>
                )}
              </Card.Root>
            </Listbox.Item>
          ) : (
            <Listbox.Item key={entry.value} id={entry.value} highlightOnHover>
              {entry.icon && <Listbox.ItemIcon />}
              <Listbox.ItemText />
              {entry.description != null && <Listbox.ItemDescription />}
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
          ),
        )}
      </Listbox.Content>
    </Listbox.Viewport>
    <Listbox.Empty icon='ph--database--regular'>Nothing here yet — generate a graph, or create a record.</Listbox.Empty>
  </Listbox.Root>
);
