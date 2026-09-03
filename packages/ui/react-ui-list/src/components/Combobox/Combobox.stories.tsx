//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, within } from 'storybook/test';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Combobox } from './Combobox.tsx';

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

/**
 * A trigger given its own children, as `RefField` gives it a resolved ref's input. The slot's grid
 * is sized for the trigger's OWN label and caret, so the caret column has to collapse here —
 * otherwise it sits empty and its gap paints a strip of trigger surface beside the content.
 */
const CustomChildrenStory = () => (
  <Combobox.Root placeholder='Nothing selected'>
    <Combobox.Trigger classNames='w-full p-0'>
      <input readOnly value='Selected object' className='w-full' data-testid='combobox.custom-child' />
    </Combobox.Trigger>
    <Combobox.Content>
      <Combobox.List />
    </Combobox.Content>
  </Combobox.Root>
);

export const TestCustomChildren: Story = {
  render: CustomChildrenStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const child = await canvas.findByTestId('combobox.custom-child', {}, { timeout: 10_000 });
    const trigger = child.closest('[role="combobox"]')!;

    // One column, not two: nothing is reserved for a caret this trigger does not render.
    const columns = getComputedStyle(trigger).gridTemplateColumns.split(' ').filter(Boolean);
    await expect(columns).toHaveLength(1);

    // ...so the child reaches the trigger's own edge. The strip was 8px of `bg-input-surface`.
    const strip = trigger.getBoundingClientRect().right - child.getBoundingClientRect().right;
    await expect(Math.round(strip)).toBeLessThanOrEqual(1);
  },
};

/** The default trigger renders its own label and caret, so it keeps both columns. */
export const TestDefaultTriggerKeepsCaretColumn: Story = {
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('[role="combobox"]')!;
    await expect(trigger).not.toBeNull();
    const columns = getComputedStyle(trigger).gridTemplateColumns.split(' ').filter(Boolean);
    await expect(columns).toHaveLength(2);
  },
};
