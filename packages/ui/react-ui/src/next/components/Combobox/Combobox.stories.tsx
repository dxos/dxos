//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectAnchoredBelow, expectScoped } from '../../testing.ts';

const OPTIONS: Next.ComboboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
];

const startsWith: Next.ComboboxFilter = (option, query) => option.label.toLowerCase().startsWith(query.toLowerCase());

type StoryArgs = {
  /** Match from the start of the label instead of anywhere in it. */
  prefix?: boolean;
};

const DefaultStory = ({ prefix }: StoryArgs) => (
  <div className='nx-scope @container flex flex-col w-[24rem] border border-separator' data-size='md'>
    {SIZES.map((size) => (
      <Next.Container key={size} size={size} gutter='rail' level='base'>
        <Next.Field.Root>
          <Next.Combobox.Root items={OPTIONS} filter={prefix ? startsWith : undefined}>
            <Next.Combobox.Label>Owner {size}</Next.Combobox.Label>
            <Next.Combobox.Input placeholder='Search people' data-testid={`combobox-${size}`} />
            <Next.Combobox.Content size={size} data-testid={`listbox-${size}`} />
          </Next.Combobox.Root>
        </Next.Field.Root>
        <Next.Input aria-label={`Note ${size}`} data-testid={`input-${size}`} />
      </Next.Container>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/combobox',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The control row is control-tall and as wide as an Input at every size, with its caret trigger a control square. */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const control = byTestId(canvasElement, `combobox-${size}`);
      const rect = control.getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, size).toBeCloseTo(
        byTestId(canvasElement, `input-${size}`).getBoundingClientRect().width,
        0,
      );
      await expect(parseFloat(getComputedStyle(control).marginTop), size).toBeCloseTo(GEOMETRY[size].inset, 0);
      const trigger = control.querySelector('[data-part="trigger"]')?.getBoundingClientRect();
      await expect(trigger?.width, size).toBeCloseTo(controlSize(size), 0);
      await expect(trigger?.right, size).toBeCloseTo(rect.right, 0);
    }
    await expectScoped(canvasElement);
  },
};

/** Typing filters the portalled listbox (case-insensitive substring); choosing fills the input; the story ends open. */
export const Filter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const input = canvas.getByRole('combobox', { name: 'Owner md' });

    await userEvent.click(within(byTestId(canvasElement, 'combobox-md')).getByRole('button'));
    const listbox = await body.findByRole('listbox');
    await expect(listbox).toBe(body.getByTestId('listbox-md'));
    await expectAnchoredBelow(byTestId(canvasElement, 'combobox-md'), listbox);
    await expect(listbox).toHaveAttribute('data-surface', 'popup');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(listbox).getByRole('option', { name: 'Dan Brown' })).toHaveAttribute('data-disabled');

    await userEvent.type(input, 'gr');
    await waitFor(() => expect(within(listbox).getAllByRole('option')).toHaveLength(2));
    await userEvent.click(within(listbox).getByRole('option', { name: 'Bob Grey' }));
    await waitFor(() => expect(input).toHaveValue('Bob Grey'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // Reopening lists every option again, and a query with no match shows the empty state.
    await userEvent.clear(input);
    await userEvent.type(input, 'zz');
    const reopened = await body.findByRole('listbox');
    await waitFor(() => expect(within(reopened).queryAllByRole('option')).toHaveLength(0));
    await expect(reopened).toHaveTextContent('No results');
    await userEvent.clear(input);
    await userEvent.type(input, 'a');
    await waitFor(() => expect(within(body.getByRole('listbox')).getAllByRole('option').length).toBeGreaterThan(1));
  },
};

/** A custom `filter` replaces the default substring match. */
export const CustomFilter: Story = {
  args: { prefix: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = within(canvasElement).getByRole('combobox', { name: 'Owner md' });
    await userEvent.type(input, 'c');
    const listbox = await body.findByRole('listbox');
    await waitFor(() => expect(within(listbox).getAllByRole('option')).toHaveLength(1));
    await expect(within(listbox).getByRole('option', { name: 'Carol Black' })).toBeVisible();
  },
};

/** Items that arrive after mount, with a value already selected, as a lookup or query would deliver them. */
const AsyncItemsStory = () => {
  const [items, setItems] = useState<Next.ComboboxOption[]>([]);
  useEffect(() => {
    const timeout = setTimeout(() => setItems(OPTIONS), 100);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <div className='nx-scope w-[20rem]' data-size='md'>
      <Next.Field.Root>
        <Next.Combobox.Root items={items} defaultValue={[OPTIONS[1].value]}>
          <Next.Combobox.Label>Owner</Next.Combobox.Label>
          <Next.Combobox.Input data-testid='async' />
          <Next.Combobox.Content size='md' />
        </Next.Combobox.Root>
      </Next.Field.Root>
    </div>
  );
};

/** A preselected value shows its label once the items load. */
export const AsyncItems: Story = {
  render: AsyncItemsStory,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');
    await waitFor(() => expect(input).toHaveValue(OPTIONS[1].label));
  },
};

/** Typing then Enter selects the first match. */
export const EnterSelectsFirst: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getAllByRole('combobox')[0];
    await userEvent.click(input);
    await userEvent.type(input, 'ali');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(input).toHaveValue('Alice Green'));
  },
};
