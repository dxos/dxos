//
// Copyright 2026 DXOS.org
//

import React, { useRef } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Empty from '@dxos/react-ui/Empty';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { type PredicateItem } from '../types.ts';

export type PredicateListProps = Util.ThemedClassName<{
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
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>
            Predicates{predicates.length > 0 ? ` (${predicates.length})` : ''}
          </Toolbar.Text>
          <Button.Button
            icon='ph--x--regular'
            iconOnly
            label='Clear'
            disabled={!selected}
            onClick={() => onSelect(undefined)}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='overflow-auto'>
        {predicates.length === 0 ? (
          <Empty.Empty>No predicates.</Empty.Empty>
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
                  <span className='shrink-0 text-fg-subtle tabular-nums'>{item.count}</span>
                  <Listbox.ItemIndicator />
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
