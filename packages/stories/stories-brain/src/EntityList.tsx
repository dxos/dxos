//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { IconButton, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

import { type EntityItem } from './util';

export type EntityListProps = ThemedClassName<{
  entities: EntityItem[];
  /** Selected entity id (the context); `undefined` means no context (show all). */
  selected?: string;
  onSelect: (id: string | undefined) => void;
}>;

/**
 * Entity column: the distinct entities mentioned across the facts (subject/object), derived from the
 * facts rather than message authors — so loaded documents populate it too. Selecting an entity sets
 * the shared context (drives the list + graph views); clicking it again clears the context. `Listbox`
 * can't clear its own value from the UI, so the per-row `onClick` handles the toggle-off.
 */
export const EntityList = ({ entities, selected, onSelect, classNames }: EntityListProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text classNames='grow'>Entities{entities.length > 0 ? ` (${entities.length})` : ''}</Toolbar.Text>
        <IconButton
          icon='ph--x--regular'
          iconOnly
          label='Clear'
          disabled={!selected}
          onClick={() => onSelect(undefined)}
        />
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content classNames='overflow-auto'>
      {entities.length === 0 ? (
        <Empty label='No entities.' />
      ) : (
        <Listbox.Root value={selected} onValueChange={onSelect}>
          <Listbox.Content aria-label='Entities'>
            {entities.map((entity) => (
              <Listbox.Item
                classNames='gap-2'
                key={entity.id}
                id={entity.id}
                onClick={() => selected === entity.id && onSelect(undefined)}
              >
                <Listbox.ItemLabel>{entity.label}</Listbox.ItemLabel>
                <span className='shrink-0 text-subdued tabular-nums'>{entity.count}</span>
                <Listbox.Indicator />
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Root>
      )}
    </Panel.Content>
  </Panel.Root>
);
