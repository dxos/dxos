//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size, SIZES } from '../../sizes.ts';
import { type SizeArgs, withSizes } from '../../stories.tsx';

/** Icon size (and so track height) per size, in px. */
const ICON: Record<Size, number> = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Switch label={`Notifications (${size})`} defaultChecked={size === 'md'} />
    <Next.Switch label={`Disabled (${size})`} disabled />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/switch',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Toggling flips the checked state; the track is icon-tall and the root block-tall at every size. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const size of SIZES) {
      const scope = canvas.getByTestId(`size-${size}`);
      const control = scope.querySelector<HTMLElement>('[data-scope="switch"][data-part="control"]');
      await expect(control?.getBoundingClientRect().height, size).toBeCloseTo(ICON[size], 0);
      await expect(control?.getBoundingClientRect().width, size).toBeCloseTo(ICON[size] * 1.75, 0);
      const block = parseFloat(getComputedStyle(scope).getPropertyValue('--nx-block-size')) * 16;
      const root = scope.querySelector<HTMLElement>('[data-scope="switch"][data-part="root"]');
      await expect(root?.getBoundingClientRect().height, size).toBeCloseTo(block, 0);
    }

    // A native checkbox with `role=switch`: the platform maps `checked` to the switch's checked state.
    const input = canvas.getByRole('switch', { name: 'Notifications (sm)', checked: false });
    await expect(input).toHaveAttribute('type', 'checkbox');
    const control = canvas.getByTestId('size-sm').querySelector('[data-part="control"]');
    await expect(input).not.toBeChecked();
    await expect(control).toHaveAttribute('data-state', 'unchecked');
    const unchecked = control ? getComputedStyle(control).backgroundColor : '';
    await userEvent.click(canvas.getByText('Notifications (sm)'));
    await waitFor(() => expect(input).toBeChecked());
    await expect(canvas.getByRole('switch', { name: 'Notifications (sm)', checked: true })).toBe(input);
    await expect(control).toHaveAttribute('data-state', 'checked');
    await expect(control ? getComputedStyle(control).backgroundColor : '').not.toBe(unchecked);

    // The thumb stays inside its track once it has moved to the end.
    const thumb = control?.querySelector('[data-part="thumb"]');
    await waitFor(() => {
      const track = control?.getBoundingClientRect();
      const box = thumb?.getBoundingClientRect();
      return expect(track && box && box.right <= track.right + 0.5 && box.right >= track.right - 3).toBe(true);
    });

    // Space toggles the focused switch back, per the switch keyboard contract.
    input.focus();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(input).not.toBeChecked());
    await expect(control).toHaveAttribute('data-state', 'unchecked');

    // A disabled switch ignores clicks.
    const disabled = canvas.getByRole('switch', { name: 'Disabled (md)' });
    await expect(disabled).toBeDisabled();
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0);
  },
};
