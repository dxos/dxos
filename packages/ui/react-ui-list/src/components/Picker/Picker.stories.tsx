//
// Copyright 2026 DXOS.org
//

// `Picker` stories — exercises the generic listbox-with-input compound
// in isolation. The compound is search-agnostic; the `Filtering` story
// shows how a caller wires in-memory filtering on top, and the
// `WithDisabled` story demonstrates the registry's skip-disabled
// behaviour during keyboard nav.
//
// For a search-themed wrapper with debounced query / auto-select-first /
// fuzzy filtering, see `SearchList` in `@dxos/react-ui-search`.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { Column, ScrollArea } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Picker } from './Picker';

random.seed(1234);

type StoryItem = { value: string; label: string };

const allItems: StoryItem[] = Array.from({ length: 24 }, (_, i) => ({
  value: `item-${i}`,
  label: random.commerce.productName(),
})).sort((a, b) => a.label.localeCompare(b.label));

//
// Single configurable story. Each variant exported below sets a
// different combination of props — keeps the per-variant code to one
// line at the bottom of the file. See `AUDIT.md` §11 corrections for
// the convention.
//

type StoryArgs = {
  /** Items to render. Defaults to the full 24-item catalog. */
  items?: StoryItem[];
  /** When true, the input is controlled and filters the rendered set. */
  controlled?: boolean;
  /** Indices into `items` that should render disabled. */
  disabledIndices?: number[];
};

const DefaultStory = ({ items = allItems, controlled = false, disabledIndices = [] }: StoryArgs = {}) => {
  const [picked, setPicked] = useState<string | undefined>();
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () =>
      controlled
        ? items
            .map((item, originalIndex) => ({ item, originalIndex }))
            .filter(({ item }) => item.label.toLowerCase().includes(query.toLowerCase()))
        : items.map((item, originalIndex) => ({ item, originalIndex })),
    [controlled, items, query],
  );

  return (
    <Column.Root gutter='sm' classNames='w-[24rem] border border-separator rounded-md py-form-gap'>
      <Picker.Root>
        <Column.Center>
          <Picker.Input
            autoFocus
            placeholder={controlled ? 'Filter…' : '↑/↓ to navigate, Enter to pick'}
            {...(controlled && { value: query, onValueChange: setQuery })}
          />
        </Column.Center>
        <ScrollArea.Root classNames='max-h-[20rem] py-form-gap' thin>
          <ScrollArea.Viewport>
            <ul role='listbox' className='flex flex-col'>
              {visible.map(({ item, originalIndex }) => {
                const disabled = disabledIndices.includes(originalIndex);
                return (
                  <Picker.Item
                    key={item.value}
                    value={item.value}
                    disabled={disabled}
                    onSelect={() => setPicked(item.value)}
                  >
                    {item.label}
                    {disabled && ' (disabled)'}
                  </Picker.Item>
                );
              })}
              {controlled && visible.length === 0 && (
                <li role='status' className='px-2 py-1 text-description italic'>
                  No matches
                </li>
              )}
            </ul>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Picker.Root>
      <Column.Center classNames='text-sm text-description'>
        Picked: <span className='font-mono'>{picked ?? '—'}</span>
      </Column.Center>
    </Column.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/Picker',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {};

export const Filtering: Story = {
  args: {
    controlled: true,
  },
};

export const WithDisabled: Story = {
  args: {
    items: allItems.slice(0, 8),
    disabledIndices: [2, 5],
  },
};
