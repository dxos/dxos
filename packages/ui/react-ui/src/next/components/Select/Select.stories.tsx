//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, centreY, controlSize, expectAnchoredBelow, expectScoped, sizeRow } from '../../testing.ts';

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

/** A plain select and one whose options have leading icons; `Select.Content` takes the row's size (finding 9). */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
    <Next.Select.Root items={OPTIONS} positioning={{ sameWidth: true }}>
      <Next.Select.Trigger placeholder='Color' aria-label={`Color ${size}`} data-testid={`select-${size}`} />
      <Next.Select.Content size={size} data-testid={`listbox-${size}`}>
        {OPTIONS.map((item) => (
          <Fragment key={item.value}>
            {item.disabled && <Next.Select.Separator />}
            <Next.Select.Item item={item} />
          </Fragment>
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
    <Next.Select.Root items={ICON_OPTIONS} positioning={{ sameWidth: true }}>
      <Next.Select.Trigger placeholder='View' aria-label={`View ${size}`} />
      <Next.Select.Content size={size}>
        {ICON_OPTIONS.map((item) => (
          <Next.Select.Item key={item.value} item={item} />
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  </Next.Toolbar.Root>
);

const meta = {
  title: 'ui/react-ui-core/next/components/select',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[24rem]' }), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Triggers are control-tall and centred in their block at every size (decision 12). Clicking the trigger opens a
 * portalled listbox at `level='popup'`; choosing an option closes it and shows the choice, and Escape closes it without
 * choosing; a decorative Separator spans the popup between options. Option icons lead each item and, once chosen, the trigger's value, at the size's icon scale. The story
 * ends with the icon listbox open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const rect = byTestId(canvasElement, `select-${size}`).getBoundingClientRect();
      await expect(rect.height, `select-${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(rect), `select-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
    }
    await expectScoped(canvasElement);

    const canvas = within(sizeRow(canvasElement, 'md'));
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', { name: 'Color md' });
    await userEvent.click(trigger);
    const listbox = await body.findByRole('listbox');
    await expect(listbox).toBe(body.getByTestId('listbox-md'));
    await expectAnchoredBelow(trigger, listbox);
    await expect(listbox.dataset.surface).toBe('popup');
    await expect(listbox.dataset.size).toBe('md');
    await expect(getComputedStyle(listbox).getPropertyValue('--nx-level').trim()).toBe('5');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(listbox).getByRole('option', { name: 'Black' })).toHaveAttribute('data-disabled');
    // The separator is decorative: a listbox owns only options and groups.
    const separator = listbox.querySelector<HTMLElement>('[data-scope="separator"]');
    await expect(separator).toHaveAttribute('aria-hidden', 'true');
    await expect(within(listbox).queryByRole('separator')).toBeNull();
    await expect(separator?.getBoundingClientRect().width).toBeCloseTo(listbox.clientWidth, 0);

    await userEvent.click(within(listbox).getByRole('option', { name: 'Green' }));
    await waitFor(() => expect(trigger).toHaveTextContent('Green'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    await userEvent.click(trigger);
    await body.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());
    await expect(trigger).toHaveTextContent('Green');

    const view = canvas.getByRole('combobox', { name: 'View md' });
    await expect(view.querySelectorAll('.nx-icon')).toHaveLength(1);
    await userEvent.click(view);
    await userEvent.click(await body.findByRole('option', { name: 'Grid' }));
    await waitFor(() => expect(view).toHaveTextContent('Grid'));
    const icons = view.querySelectorAll<SVGElement>('.nx-icon');
    await expect(icons).toHaveLength(2);
    await expect(icons[0].getAttribute('aria-hidden')).toBe('true');
    await expect(icons[0].getBoundingClientRect().left).toBeLessThan(
      within(view).getByText('Grid').getBoundingClientRect().left,
    );
    await expect(icons[0].getBoundingClientRect().width).toBeCloseTo(16, 0);

    await userEvent.click(view);
    const views = await body.findByRole('listbox');
    for (const option of within(views).getAllByRole('option')) {
      const icon = option.querySelector<SVGElement>('.nx-icon');
      await expect(icon?.getBoundingClientRect().width).toBeCloseTo(16, 0);
      await expect(icon?.getBoundingClientRect().left).toBeLessThan(option.getBoundingClientRect().left + 16);
    }
    await expectScoped(canvasElement);
  },
};
