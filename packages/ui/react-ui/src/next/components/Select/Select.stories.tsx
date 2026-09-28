//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black', disabled: true },
];

const ICON_OPTIONS: Next.SelectOption[] = [
  { value: 'list', label: 'List', icon: 'ph--list--regular' },
  { value: 'grid', label: 'Grid', icon: 'ph--squares-four--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
];

type StoryArgs = {
  /** Options with leading icons. */
  icons?: boolean;
};

const DefaultStory = ({ icons }: StoryArgs) => (
  <div className='nx-scope flex flex-col w-[16rem]' data-size='md'>
    {SIZES.map((size) => (
      <Next.Toolbar key={size} size={size} data-testid={`toolbar-${size}`}>
        <Next.Select.Root items={icons ? ICON_OPTIONS : OPTIONS} positioning={{ sameWidth: true }}>
          <Next.Select.Trigger placeholder='Color' aria-label={`Color ${size}`} data-testid={`select-${size}`} />
          <Next.Select.Content size={size} data-testid={`listbox-${size}`}>
            {(icons ? ICON_OPTIONS : OPTIONS).map((item) => (
              <Next.Select.Item key={item.value} item={item} />
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
      </Next.Toolbar>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/select',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Triggers are control-tall and centred in their block at every size (decision 12). */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const rect = byTestId(canvasElement, `select-${size}`).getBoundingClientRect();
      await expect(rect.height, `select-${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(rect), `select-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
    }
    await expectScoped(canvasElement);
  },
};

/** Clicking the trigger opens a portalled listbox at `level='popup'`; the story ends with it open. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', { name: 'Color md' });
    await userEvent.click(trigger);
    const listbox = await body.findByRole('listbox');
    await expect(listbox).toBe(body.getByTestId('listbox-md'));
    await expect(listbox.dataset.surface).toBe('popup');
    await expect(listbox.dataset.size).toBe('md');
    await expect(getComputedStyle(listbox).getPropertyValue('--nx-level').trim()).toBe('5');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(listbox).getByRole('option', { name: 'Black' })).toHaveAttribute('data-disabled');
  },
};

/** Choosing an option closes the listbox and shows the choice; Escape closes it without choosing. */
export const Dismiss: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', { name: 'Color md' });
    await userEvent.click(trigger);
    await userEvent.click(await body.findByRole('option', { name: 'Green' }));
    await waitFor(() => expect(trigger).toHaveTextContent('Green'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    await userEvent.click(trigger);
    await body.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());
    await expect(trigger).toHaveTextContent('Green');
  },
};

/** Option icons lead each item and, once chosen, the trigger's value, at the size's icon scale; the story ends open. */
export const Icons: Story = {
  args: { icons: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', { name: 'Color md' });
    await expect(trigger.querySelectorAll('.nx-icon')).toHaveLength(1);

    await userEvent.click(trigger);
    await userEvent.click(await body.findByRole('option', { name: 'Grid' }));
    await waitFor(() => expect(trigger).toHaveTextContent('Grid'));
    const icons = trigger.querySelectorAll<SVGElement>('.nx-icon');
    await expect(icons).toHaveLength(2);
    await expect(icons[0].getAttribute('aria-hidden')).toBe('true');
    await expect(icons[0].getBoundingClientRect().left).toBeLessThan(
      within(trigger).getByText('Grid').getBoundingClientRect().left,
    );
    await expect(icons[0].getBoundingClientRect().width).toBeCloseTo(16, 0);

    await userEvent.click(trigger);
    const listbox = await body.findByRole('listbox');
    for (const option of within(listbox).getAllByRole('option')) {
      const icon = option.querySelector<SVGElement>('.nx-icon');
      await expect(icon?.getBoundingClientRect().width).toBeCloseTo(16, 0);
      await expect(icon?.getBoundingClientRect().left).toBeLessThan(option.getBoundingClientRect().left + 16);
    }
    await expectScoped(canvasElement);
  },
};
