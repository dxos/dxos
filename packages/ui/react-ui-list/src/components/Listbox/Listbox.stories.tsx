//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import { Next } from '@dxos/react-ui';
import { SIZE_ARG_TYPES, type SizeArgs, withLayout, withSizes, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { Listbox } from './Listbox.tsx';
import { listboxSelection } from './selection.ts';

const ITEMS: Next.ListboxOption[] = [
  { value: 'alpha', label: 'Alpha', description: 'The first letter' },
  { value: 'bravo', label: 'Bravo' },
  { value: 'charlie', label: 'Charlie', disabled: true },
  { value: 'delta', label: 'Delta' },
  { value: 'echo', label: 'Echo' },
];

const LONG: Next.ListboxOption[] = Array.from({ length: 40 }, (_, index) => ({
  value: `item-${index + 1}`,
  label: `Item ${index + 1}`,
}));

/**
 * A single-selection list with icons, a description, a disabled row and the indicator; a plain list; and a long list
 * scrolling in a `Next.Panel` under a filtering toolbar (the current Default, WithDisabled, Plain and WithToolbar).
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [selected, setSelected] = useState<string | undefined>('alpha');
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(['bravo']));
  const filtered = LONG.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <Listbox.Root
        items={ITEMS}
        value={selected}
        onValueChange={setSelected}
        onDeselect={() => setSelected(undefined)}
      >
        <Listbox.Label>Letters</Listbox.Label>
        <Listbox.Content>
          {ITEMS.map((item) => (
            <Listbox.Item key={item.value} id={item.value} data-testid={`letter-${item.value}-${size}`}>
              <Listbox.ItemIcon icon='ph--circle--regular' />
              <Listbox.ItemText />
              {item.description && <Listbox.ItemDescription />}
              <Listbox.ItemIndicator />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Next.Typography data-testid={`selected-${size}`}>{selected ?? 'None'}</Next.Typography>
      <Listbox.Root items={ITEMS}>
        <Listbox.Content aria-label='Plain'>
          {ITEMS.map((item) => (
            <Listbox.Item key={item.value} id={item.value} />
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Next.Listbox.Root
        items={ITEMS}
        {...listboxSelection({ mode: 'multi', value: picked, onValueChange: setPicked })}
      >
        <Next.Listbox.Content aria-label='Picked'>
          {ITEMS.map((item) => (
            <Next.Listbox.Item key={item.value} item={item}>
              <Next.Listbox.ItemText />
              <Next.Listbox.ItemIndicator />
            </Next.Listbox.Item>
          ))}
        </Next.Listbox.Content>
      </Next.Listbox.Root>
      <Next.Typography data-testid={`picked-${size}`}>{Array.from(picked).join(' ')}</Next.Typography>
      <div className='h-48'>
        <Next.Panel.Root>
          <Next.Panel.Header>
            <Next.Toolbar.Root>
              <Next.Input
                aria-label='Filter'
                placeholder='Filter…'
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Next.Toolbar.Root>
          </Next.Panel.Header>
          <Next.Panel.Body>
            <Listbox.Root items={filtered} value={undefined} onValueChange={() => {}}>
              <Listbox.Content aria-label='Long'>
                {filtered.map((item) => (
                  <Listbox.Item key={item.value} id={item.value} />
                ))}
              </Listbox.Content>
              <Listbox.Empty>No matches</Listbox.Empty>
            </Listbox.Root>
          </Next.Panel.Body>
        </Next.Panel.Root>
      </div>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-list/Listbox',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Selection is opt-in and single, keyed by the item id: the selected row reports `aria-selected`, clicking another
 * selects it, clicking it again deselects (`onDeselect`), and the disabled row is skipped. Without a value model the
 * list selects nothing; `listboxSelection` adapts a set of ids to multiple selection. The filter narrows the long list
 * inside the Panel, down to its Empty part.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const letters = canvas.getByRole('listbox', { name: 'Letters' });
    await expect(within(letters).getByRole('option', { name: /Alpha/ })).toHaveAttribute('aria-selected', 'true');
    await expect(within(letters).getByRole('option', { name: /Charlie/ })).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(within(letters).getByRole('option', { name: /Delta/ }));
    await waitFor(() => expect(canvas.getByTestId('selected-md')).toHaveTextContent('delta'));
    await expect(within(letters).getByRole('option', { name: /Alpha/ })).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(within(letters).getByRole('option', { name: /Delta/ }));
    await waitFor(() => expect(canvas.getByTestId('selected-md')).toHaveTextContent('None'));

    letters.focus();
    await userEvent.keyboard('{Home}{ArrowDown}{ArrowDown}{Enter}');
    await waitFor(() => expect(canvas.getByTestId('selected-md')).toHaveTextContent('delta'));

    // Without a value model the list selects nothing but keeps the listbox machine.
    const plain = canvas.getByRole('listbox', { name: 'Plain' });
    await expect(within(plain).getAllByRole('option')).toHaveLength(ITEMS.length);
    await userEvent.click(within(plain).getByRole('option', { name: 'Bravo' }));
    await expect(within(plain).queryByRole('option', { selected: true })).toBeNull();

    // `listboxSelection` adapts a set of ids to Ark's multiple selection.
    const picked = canvas.getByRole('listbox', { name: 'Picked' });
    await expect(picked).toHaveAttribute('aria-multiselectable', 'true');
    await expect(within(picked).getByRole('option', { name: 'Bravo' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(picked).getByRole('option', { name: 'Delta' }));
    await waitFor(() => expect(canvas.getByTestId('picked-md')).toHaveTextContent('bravo delta'));

    const long = canvas.getByRole('listbox', { name: 'Long' });
    await expect(within(long).getAllByRole('option')).toHaveLength(LONG.length);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Filter' }), 'Item 1');
    await waitFor(() => expect(within(long).getAllByRole('option')).toHaveLength(11));
    await expect(canvas.queryByText('No matches')).toBeNull();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Filter' }), 'x');
    await waitFor(() => expect(canvas.getByText('No matches')).toBeVisible());
  },
};
