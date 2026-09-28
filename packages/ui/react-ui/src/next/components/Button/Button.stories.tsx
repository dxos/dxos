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
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

type StoryArgs = {
  disabled?: boolean;
};

const DefaultStory = ({ disabled }: StoryArgs) => (
  <div className='nx-scope flex flex-col w-[20rem]' data-size='md'>
    {SIZES.map((size) => (
      <Next.Toolbar key={size} size={size} data-testid={`toolbar-${size}`}>
        <Next.Button disabled={disabled} data-testid={`button-${size}`}>
          Save
        </Next.Button>
        <Next.Button variant='primary' disabled={disabled} data-testid={`primary-${size}`}>
          Publish
        </Next.Button>
      </Next.Toolbar>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/button',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Buttons are control-tall and centred in their block at every size (decision 12). */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height, `toolbar-${size}`).toBeCloseTo(GEOMETRY[size].block, 0);
      for (const part of ['button', 'primary']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
      }
    }
  },
};

/** A button is `type=button`, so it never submits an enclosing form; the primary variant is painted with the accent. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const save = canvas.getAllByRole('button', { name: 'Save' })[0];
    await expect(save).toHaveAttribute('type', 'button');
    await expect(save).toHaveAttribute('data-variant', 'default');
    const publish = canvas.getAllByRole('button', { name: 'Publish' })[0];
    await expect(publish).toHaveAttribute('data-variant', 'primary');
    await expect(getComputedStyle(publish).backgroundColor).not.toBe(getComputedStyle(save).backgroundColor);
    await expectScoped(canvasElement);
  },
};

/** Disabled buttons drop out of the toolbar's roving focus and ignore clicks. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const save = byTestId(canvasElement, 'button-md');
    await expect(save).toBeDisabled();
    await userEvent.click(save);
    await expect(save).not.toHaveFocus();
  },
};
