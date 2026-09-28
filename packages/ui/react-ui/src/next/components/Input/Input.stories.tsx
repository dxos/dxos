//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

const DefaultStory = ({ size }: SizeArgs) => (
  <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
    <Next.Input placeholder='Search' aria-label={`Search ${size}`} data-testid={`input-${size}`} />
    <Next.Input placeholder='Disabled' aria-label={`Disabled ${size}`} disabled />
  </Next.Toolbar.Root>
);

const meta = {
  title: 'ui/react-ui-core/next/components/input',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Inputs are control-tall and centred in their block at every size (decision 12); a text input is named by its
 * `aria-label` and takes typed text, unless disabled.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const rect = byTestId(canvasElement, `input-${size}`).getBoundingClientRect();
      await expect(rect.height, `input-${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(rect), `input-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
    }

    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Search md' });
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'hello');
    await expect(input).toHaveValue('hello');
    await expectScoped(canvasElement);

    const disabled = canvas.getByRole('textbox', { name: 'Disabled md' });
    await expect(disabled).toBeDisabled();
    await userEvent.type(disabled, 'hello');
    await expect(disabled).toHaveValue('');
  },
};
