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
import {
  GEOMETRY,
  byTestId,
  controlSize,
  expectAnchoredBelow,
  expectPopupSize,
  expectScoped,
  expectScrollingPopup,
  popupFrame,
  sizeRow,
} from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const OPTIONS: Next.ComboboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
];

/** Enough options to overflow the popup's 20rem cap at every size. */
const LONG: Next.ComboboxOption[] = Array.from({ length: 30 }, (_, index) => ({
  value: `person-${index + 1}`,
  label: `Person ${index + 1}`,
}));

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
        <Next.Combobox.Label>Lead</Next.Combobox.Label>
        <Next.Combobox.Control />
        <Next.Combobox.Content />
      </Next.Combobox.Root>
    </Next.Field.Root>
  );
};

/**
 * The default substring filter with a clear trigger, a custom prefix `filter`, late-loading items in a Control that
 * renders its default Input and Trigger, and a long list that scrolls.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <>
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS}>
        <Next.Combobox.Label>Owner</Next.Combobox.Label>
        <Next.Combobox.Control data-testid={`combobox-${size}`}>
          <Next.Combobox.Input placeholder='Search people' />
          <Next.Combobox.ClearTrigger aria-label='Clear owner' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content data-testid={`listbox-${size}`} />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <Next.Input aria-label='Note' data-testid={`input-${size}`} />
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS} filter={startsWith}>
        <Next.Combobox.Label>Reviewer</Next.Combobox.Label>
        <Next.Combobox.Control>
          <Next.Combobox.Input placeholder='Starts with' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content size='lg' />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <AsyncCombobox size={size} />
    <Next.Field.Root>
      <Next.Combobox.Root items={LONG}>
        <Next.Combobox.Label>Assignee</Next.Combobox.Label>
        <Next.Combobox.Control data-testid={`long-${size}`}>
          <Next.Combobox.Input placeholder='Many people' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content />
      </Next.Combobox.Root>
    </Next.Field.Root>
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
 * The control row is control-tall and as wide as an Input at every size, with its caret trigger a control square; a
 * ClearTrigger shows only while there is a value, and clears it. A
 * preselected value shows its label once late items load; typing then Enter selects the first match; a custom
 * `filter` replaces the default substring match. Typing filters the portalled listbox (case-insensitive substring) and
 * choosing fills the input; a long listbox scrolls in a thin ScrollArea with no native bar, keeping the highlight in
 * view. The listbox takes its control row's size unless given its own. The story ends open.
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
    await waitFor(() => expect(md.getByRole('combobox', { name: 'Lead' })).toHaveValue(OPTIONS[1].label));

    const first = within(sizeRow(canvasElement, 'xs')).getByRole('combobox', { name: 'Owner' });
    await userEvent.click(first);
    await userEvent.type(first, 'ali');
    // The listbox takes its control's row size (Phase 4 decision 2).
    await expectPopupSize(await body.findByRole('listbox'), 'xs');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(first).toHaveValue('Alice Green'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    const reviewer = md.getByRole('combobox', { name: 'Reviewer' });
    await userEvent.type(reviewer, 'c');
    const prefixed = await body.findByRole('listbox');
    // An explicit size wins over the inherited one.
    await expectPopupSize(prefixed, 'lg');
    await waitFor(() => expect(within(prefixed).getAllByRole('option')).toHaveLength(1));
    await expect(within(prefixed).getByRole('option', { name: 'Carol Black' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // A long listbox scrolls in a thin ScrollArea, and the keyboard highlight stays in view.
    const assignee = md.getByRole('combobox', { name: 'Assignee' });
    await userEvent.click(within(byTestId(canvasElement, 'long-md')).getByRole('button'));
    const longList = await body.findByRole('listbox');
    await waitFor(() => expect(assignee).toHaveFocus());
    await expect(popupFrame(longList)).toHaveAttribute('data-width', 'thin');
    await expectScrollingPopup(longList, 20);
    // The arrow keys stop at either end rather than wrapping.
    const highlighted = () => longList.querySelector('[data-highlighted]')?.textContent;
    const options = within(longList).getAllByRole('option');
    await userEvent.keyboard('{End}{ArrowDown}');
    await waitFor(() => expect(highlighted()).toBe(options[options.length - 1].textContent));
    await userEvent.keyboard('{Home}{ArrowUp}');
    await waitFor(() => expect(highlighted()).toBe(options[0].textContent));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    const input = md.getByRole('combobox', { name: 'Owner' });

    await userEvent.click(within(byTestId(canvasElement, 'combobox-md')).getByRole('button'));
    const listbox = await body.findByRole('listbox');
    await expect(listbox).toBe(body.getByTestId('listbox-md'));
    await expectAnchoredBelow(byTestId(canvasElement, 'combobox-md'), listbox);
    // The ScrollArea frame is the surface; the listbox itself is its viewport.
    await expect(popupFrame(listbox)).toHaveAttribute('data-surface', 'popup');
    await expect(listbox).toHaveAttribute('data-scope', 'combobox');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(listbox).getByRole('option', { name: 'Dan Brown' })).toHaveAttribute('data-disabled');

    await userEvent.type(input, 'gr');
    await waitFor(() => expect(within(listbox).getAllByRole('option')).toHaveLength(2));
    await userEvent.click(within(listbox).getByRole('option', { name: 'Bob Grey' }));
    await waitFor(() => expect(input).toHaveValue('Bob Grey'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // The clear trigger appears with a value and clears it.
    const clear = byTestId(canvasElement, 'combobox-md').querySelector<HTMLElement>('[data-part="clear-trigger"]');
    await expect(clear).toBeVisible();
    if (clear) {
      await userEvent.click(clear);
    }
    await waitFor(() => expect(input).toHaveValue(''));
    await waitFor(() => expect(clear).not.toBeVisible());

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
