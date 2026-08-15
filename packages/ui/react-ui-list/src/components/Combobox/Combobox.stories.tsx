//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Combobox } from './Combobox';

random.seed(1234);

const items = random.helpers.uniqueArray(random.commerce.productName, 16).sort();

// Simple in-memory substring filter — Combobox is search-domain-agnostic;
// callers filter however they want and pass only matching children.
// For fuzzy/ranked filtering, pair with `useSearchListResults` from
// `@dxos/react-ui-search`.
const DefaultStory = () => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => items.filter((item) => item.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <Combobox.Root
      placeholder='Nothing selected'
      onValueChange={(value) => {
        // eslint-disable-next-line no-console
        console.log('[Combobox.Root.onValueChange]', value);
      }}
    >
      <Combobox.Trigger />
      <Combobox.Content>
        <Combobox.Input placeholder='Search...' value={query} onValueChange={setQuery} />
        <Combobox.List>
          {filtered.map((value) => (
            <Combobox.Item key={value} value={value} label={value} />
          ))}
        </Combobox.List>
        <Combobox.Arrow />
      </Combobox.Content>
    </Combobox.Root>
  );
};

// `multiple` swaps the value model to an array and each item toggles its own membership; the
// popover stays open so several can be set in one visit. `displayValue` summarizes the selection on
// the trigger, since the Root only knows values and not the labels its items render.
const MultipleStory = () => {
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<readonly string[]>([items[0], items[3]]);
  const filtered = useMemo(() => items.filter((item) => item.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <Combobox.Root
      multiple
      value={values}
      onValueChange={setValues}
      placeholder='Nothing selected'
      displayValue={values.length > 2 ? `${values.length} selected` : undefined}
    >
      <Combobox.Trigger />
      <Combobox.Content>
        <Combobox.Input placeholder='Search...' value={query} onValueChange={setQuery} />
        <Combobox.List>
          {filtered.map((value) => (
            <Combobox.Item key={value} value={value} label={value} />
          ))}
        </Combobox.List>
        <Combobox.Arrow />
      </Combobox.Content>
    </Combobox.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/Combobox',
  component: Combobox.Root as any,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-2' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Multiple: Story = {
  args: {},
  render: MultipleStory,
};
