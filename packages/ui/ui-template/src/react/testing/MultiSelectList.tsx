//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The React face of the zag probe: `useMachine` runs the framework-free machine from
// `src/testing/multi-select.ts`, and the component is nothing but bindings onto its connect surface —
// the machine is the capability, the component one of its observers.
//

import { useMachine } from '@zag-js/react';
import React, { useMemo } from 'react';

import { Listbox } from '@dxos/react-ui-list';

import { type MultiSelectSchema, connect, multiSelectMachine } from '../../testing';

export type MultiSelectItem = {
  id: string;
  label: string;
};

export type MultiSelectListProps = {
  items: readonly MultiSelectItem[];
  /** Observe the machine's committed selections. */
  onChange?: (selection: ReadonlySet<string>) => void;
};

/**
 * Multi-select list over the shared machine: plain click replaces the selection, shift-click
 * toggles the row, shift+alt-click extends the anchor range. The Listbox runs without its own
 * value model — selection lives in the machine, the rows only mark and dispatch.
 */
export const MultiSelectList = ({ items, onChange }: MultiSelectListProps) => {
  const service = useMachine<MultiSelectSchema>(multiSelectMachine, {
    items: useMemo(() => items.map(({ id }) => id), [items]),
    onChange: onChange && (({ selection }) => onChange(selection)),
  });
  const api = connect(service);

  return (
    <Listbox.Root>
      <Listbox.Viewport>
        <Listbox.Content aria-label='Tasks' aria-multiselectable>
          {items.map(({ id, label }) => (
            <Listbox.Item
              key={id}
              id={id}
              classNames={api.isSelected(id) && 'bg-selected-surface text-selected-fg font-semibold'}
              // A shift-click must not start a text selection before the row's click handler runs.
              onMouseDown={(event) => event.shiftKey && event.preventDefault()}
              onClick={(event) => (event.shiftKey && event.altKey ? api.extendTo(id) : api.select(id, event.shiftKey))}
            >
              <Listbox.ItemLabel>{label}</Listbox.ItemLabel>
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};
