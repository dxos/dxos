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
import { withTheme } from '@dxos/react-ui/testing';

import { Picker } from './Picker';

random.seed(1234);

type StoryItem = { value: string; label: string };

const items: StoryItem[] = Array.from({ length: 24 }, (_, i) => ({
  value: `item-${i}`,
  label: random.commerce.productName(),
})).sort((a, b) => a.label.localeCompare(b.label));

//
// Default — Picker with all items rendered. Caller supplies the
// `<ul role='listbox'>` wrapper around items (Picker itself doesn't own
// the listbox role).
//

// `Picker.Item` carries `dx-hover dx-selected` by default — same
// grammar as `Row`. Stories add only padding / sizing.
const itemPadding = 'px-2 py-1 rounded-xs';

const DefaultStory = () => {
  const [picked, setPicked] = useState<string | undefined>();
  return (
    <div className='flex flex-col gap-2 w-[24rem] border border-separator p-2 rounded-md'>
      <Picker.Root>
        <Picker.Input placeholder='↑/↓ to navigate, Enter to pick' autoFocus />
        <ul role='listbox' className='flex flex-col mt-2 max-h-[20rem] overflow-auto'>
          {items.map((item) => (
            <Picker.Item
              key={item.value}
              value={item.value}
              onSelect={() => setPicked(item.value)}
              classNames={itemPadding}
            >
              {item.label}
            </Picker.Item>
          ))}
        </ul>
      </Picker.Root>
      <div className='text-sm text-description'>
        Picked: <span className='font-mono'>{picked ?? '—'}</span>
      </div>
    </div>
  );
};

//
// Filtering — caller filters items in-memory and renders only matches.
// Picker re-runs its auto-select-first when the rendered set changes,
// so the highlighted option is always valid.
//

const FilteringStory = () => {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | undefined>();
  const filtered = useMemo(
    () => items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className='flex flex-col gap-2 w-[24rem] border border-separator p-2 rounded-md'>
      <Picker.Root>
        <Picker.Input placeholder='Filter…' value={query} onValueChange={setQuery} autoFocus />
        <ul role='listbox' className='flex flex-col mt-2 max-h-[20rem] overflow-auto'>
          {filtered.map((item) => (
            <Picker.Item
              key={item.value}
              value={item.value}
              onSelect={() => setPicked(item.value)}
              classNames={itemPadding}
            >
              {item.label}
            </Picker.Item>
          ))}
          {filtered.length === 0 && (
            <li role='status' className='px-2 py-1 text-description italic'>
              No matches
            </li>
          )}
        </ul>
      </Picker.Root>
      <div className='text-sm text-description'>
        Picked: <span className='font-mono'>{picked ?? '—'}</span>
      </div>
    </div>
  );
};

//
// WithDisabled — disabled items render but are skipped by the
// keyboard navigation (registry filters them via `getItemValues`).
// Click is also blocked.
//

const WithDisabledStory = () => {
  const [picked, setPicked] = useState<string | undefined>();
  return (
    <div className='flex flex-col gap-2 w-[24rem] border border-separator p-2 rounded-md'>
      <Picker.Root>
        <Picker.Input placeholder='Use ↑↓ — disabled rows skip' autoFocus />
        <ul role='listbox' className='flex flex-col mt-2 max-h-[20rem] overflow-auto'>
          {items.slice(0, 8).map((item, i) => {
            const disabled = i === 2 || i === 5;
            return (
              <Picker.Item
                key={item.value}
                value={item.value}
                disabled={disabled}
                onSelect={() => setPicked(item.value)}
                classNames={itemPadding}
              >
                {item.label}
                {disabled && ' (disabled)'}
              </Picker.Item>
            );
          })}
        </ul>
      </Picker.Root>
      <div className='text-sm text-description'>
        Picked: <span className='font-mono'>{picked ?? '—'}</span>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-list/Picker',
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: DefaultStory };
export const Filtering: Story = { render: FilteringStory };
export const WithDisabled: Story = { render: WithDisabledStory };
