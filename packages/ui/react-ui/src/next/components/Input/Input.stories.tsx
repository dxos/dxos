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
import { byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

type StoryArgs = {
  disabled?: boolean;
};

const DefaultStory = ({ disabled }: StoryArgs) => (
  <div className='nx-scope flex flex-col w-[20rem]' data-size='md'>
    {SIZES.map((size) => (
      <Next.Toolbar key={size} size={size} data-testid={`toolbar-${size}`}>
        <Next.Input
          placeholder='Search'
          aria-label={`Search ${size}`}
          disabled={disabled}
          data-testid={`input-${size}`}
        />
      </Next.Toolbar>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/input',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Inputs are control-tall and centred in their block at every size (decision 12). */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const rect = byTestId(canvasElement, `input-${size}`).getBoundingClientRect();
      await expect(rect.height, `input-${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(rect), `input-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
    }
  },
};

/** A text input named by its `aria-label` that takes typed text. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Search md' });
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'hello');
    await expect(input).toHaveValue('hello');
    await expectScoped(canvasElement);
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Search md' });
    await expect(input).toBeDisabled();
    await userEvent.type(input, 'hello');
    await expect(input).toHaveValue('');
  },
};
