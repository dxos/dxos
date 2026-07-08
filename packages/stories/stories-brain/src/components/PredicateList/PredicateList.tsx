//
// Copyright 2026 DXOS.org
//

import React, { useRef } from 'react';

import { IconButton, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

import { type PredicateItem } from '../types';

export type PredicateListProps = ThemedClassName<{
  predicates: PredicateItem[];
  /** Selected predicate (the filter); `undefined` means no filter (show all). */
  selected?: string;
  onSelect: (predicate: string | undefined) => void;
}>;

/**
 * Predicate column: the distinct predicates across the facts with occurrence counts, derived from
 * the fact graph. Selecting a predicate filters the fact viewer; clicking it again clears the filter.
 *
 * Click-to-toggle mirrors {@link EntityList}: `Listbox` selects on focus, and `focus` fires before
 * `click` in a mouse gesture, so the pre-gesture selection is captured at pointer-down and the click
 * toggles against that — a single click selects, a re-click deselects, keyboard nav still works.
 */
export const PredicateList = ({ predicates, selected, onSelect, classNames }: PredicateListProps) => {
  const pointerSelectionRef = useRef<{ itemId: string; selected: string | undefined } | undefined>(undefined);
  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>
            Predicates{predicates.length > 0 ? ` (${predicates.length})` : ''}
          </Toolbar.Text>
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
        {predicates.length === 0 ? (
          <Empty label='No predicates.' />
        ) : (
          <Listbox.Root value={selected} onValueChange={onSelect}>
            <Listbox.Content aria-label='Predicates'>
              {predicates.map((item) => (
                <Listbox.Item
                  classNames='gap-2'
                  key={item.predicate}
                  id={item.predicate}
                  onMouseDown={() => {
                    pointerSelectionRef.current = { itemId: item.predicate, selected };
                  }}
                  onClick={() => {
                    const pointerSelection = pointerSelectionRef.current;
                    pointerSelectionRef.current = undefined;
                    if (pointerSelection?.itemId === item.predicate) {
                      onSelect(pointerSelection.selected === item.predicate ? undefined : item.predicate);
                    } else {
                      onSelect(item.predicate);
                    }
                  }}
                >
                  <Listbox.ItemLabel>{item.predicate}</Listbox.ItemLabel>
                  <span className='shrink-0 text-subdued tabular-nums'>{item.count}</span>
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
