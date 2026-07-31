//
// Copyright 2026 DXOS.org
//

import React, { useRef } from 'react';

import { IconButton, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

import { type EntityItem } from '../types';

export type EntityListProps = ThemedClassName<{
  entities: EntityItem[];
  /** Selected entity id (the context); `undefined` means no context (show all). */
  selected?: string;
  onSelect: (id: string | undefined) => void;
}>;

/**
 * Entity column: the distinct entities mentioned across the facts (subject/object), derived from the
 * facts rather than message authors — so loaded documents populate it too. Selecting an entity sets
 * the shared context (drives the list + graph views); clicking it again clears the context.
 *
 * Click-to-toggle: clicking the selected entity again clears the context. `Listbox` selects on a
 * row click but also selects-on-focus, and `focus` fires before `click` in a mouse gesture (with a
 * render committed in between), so by click time the row already reads as selected and a naive
 * toggle would always clear it. The pre-gesture selection is captured at pointer-down (before focus)
 * and the click toggles against that, so a single click selects and a re-click deselects — while the
 * listbox's selection-follows-focus keeps keyboard navigation working.
 */
export const EntityList = ({ entities, selected, onSelect, classNames }: EntityListProps) => {
  const pointerSelectionRef = useRef<{ itemId: string; selected: string | undefined } | undefined>(undefined);
  return (
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
                  onMouseDown={() => {
                    pointerSelectionRef.current = { itemId: entity.id, selected };
                  }}
                  onClick={() => {
                    // Consume the pre-gesture selection captured on mouse-down (cleared each gesture so a
                    // later click without a fresh mouse-down can't toggle against stale state).
                    const pointerSelection = pointerSelectionRef.current;
                    pointerSelectionRef.current = undefined;
                    if (pointerSelection?.itemId === entity.id) {
                      onSelect(pointerSelection.selected === entity.id ? undefined : entity.id);
                    } else {
                      onSelect(entity.id);
                    }
                  }}
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
};
