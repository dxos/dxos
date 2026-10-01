//
// Copyright 2026 DXOS.org
//

import React, { useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';

import { type PredicateItem } from '../types.ts';

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
    <Next.Panel.Root classNames={classNames}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text classNames='grow'>
            Predicates{predicates.length > 0 ? ` (${predicates.length})` : ''}
          </Next.Toolbar.Text>
          <Next.Button
            icon='ph--x--regular'
            iconOnly
            label='Clear'
            disabled={!selected}
            onClick={() => onSelect(undefined)}
          />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body classNames='overflow-auto'>
        {predicates.length === 0 ? (
          <Next.Empty>No predicates.</Next.Empty>
        ) : (
          <Listbox.Root
            value={selected}
            onValueChange={onSelect}
            items={predicates.map((item) => ({ value: item.predicate, label: item.predicate }))}
          >
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
                  <Listbox.ItemText>{item.predicate}</Listbox.ItemText>
                  <span className='shrink-0 text-subdued tabular-nums'>{item.count}</span>
                  <Listbox.ItemIndicator />
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
