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
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, controlSize, expectAnchoredBelow, expectScoped, sizeRow } from '../../testing.ts';

const OPTIONS: Next.ComboboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
];

const startsWith: Next.ComboboxFilter = (option, query) => option.label.toLowerCase().startsWith(query.toLowerCase());

/** Items that arrive after mount, with a value already selected, as a lookup or query would deliver them. */
const AsyncCombobox = ({ size = 'md' }: SizeArgs) => {
  const [items, setItems] = useState<Next.ComboboxOption[]>([]);
  useEffect(() => {
    const timeout = setTimeout(() => setItems(OPTIONS), 100);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <Next.Field.Root>
      <Next.Combobox.Root items={items} defaultValue={[OPTIONS[1].value]}>
        <Next.Combobox.Label>Lead {size}</Next.Combobox.Label>
        <Next.Combobox.Input />
        <Next.Combobox.Content size={size} />
      </Next.Combobox.Root>
    </Next.Field.Root>
  );
};

/** The default substring filter, a custom prefix `filter`, and late-loading items. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <>
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS}>
        <Next.Combobox.Label>Owner {size}</Next.Combobox.Label>
        <Next.Combobox.Input placeholder='Search people' data-testid={`combobox-${size}`} />
        <Next.Combobox.Content size={size} data-testid={`listbox-${size}`} />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <Next.Input aria-label={`Note ${size}`} data-testid={`input-${size}`} />
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS} filter={startsWith}>
        <Next.Combobox.Label>Reviewer {size}</Next.Combobox.Label>
        <Next.Combobox.Input placeholder='Starts with' />
        <Next.Combobox.Content size={size} />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <AsyncCombobox size={size} />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Combobox',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The control row is control-tall and as wide as an Input at every size, with its caret trigger a control square. A
 * preselected value shows its label once late items load; typing then Enter selects the first match; a custom
 * `filter` replaces the default substring match. Typing filters the portalled listbox (case-insensitive substring) and
 * choosing fills the input; the story ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
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

    const body = within(canvasElement.ownerDocument.body);
    const md = within(sizeRow(canvasElement, 'md'));
    await waitFor(() => expect(md.getByRole('combobox', { name: 'Lead md' })).toHaveValue(OPTIONS[1].label));

    const first = within(sizeRow(canvasElement, 'xs')).getByRole('combobox', { name: 'Owner xs' });
    await userEvent.click(first);
    await userEvent.type(first, 'ali');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(first).toHaveValue('Alice Green'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    const reviewer = md.getByRole('combobox', { name: 'Reviewer md' });
    await userEvent.type(reviewer, 'c');
    const prefixed = await body.findByRole('listbox');
    await waitFor(() => expect(within(prefixed).getAllByRole('option')).toHaveLength(1));
    await expect(within(prefixed).getByRole('option', { name: 'Carol Black' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    const input = md.getByRole('combobox', { name: 'Owner md' });

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
