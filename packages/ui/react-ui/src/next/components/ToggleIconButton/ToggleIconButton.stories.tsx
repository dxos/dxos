//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { byTestId, controlSize, expectScoped, expectTooltip } from '../../testing.ts';

const DefaultStory = () => {
  const [wrap, setWrap] = useState(false);
  return (
    <div className='nx-scope flex flex-col w-[20rem] border border-separator' data-size='md'>
      {SIZES.map((size) => (
        <Next.Toolbar key={size} size={size}>
          <Next.ToggleIconButton icon='ph--text-b--regular' label={`Bold ${size}`} data-testid={`bold-${size}`} />
          <Next.ToggleIconButton icon='ph--text-italic--regular' label={`Italic ${size}`} defaultPressed />
          <Next.ToggleIconButton icon='ph--text-underline--regular' label={`Underline ${size}`} disabled />
        </Next.Toolbar>
      ))}
      <Next.Toolbar>
        <Next.ToggleIconButton
          icon='ph--arrows-in-line-horizontal--regular'
          label='Wrap lines'
          pressed={wrap}
          onPressedChange={setWrap}
        />
        <Next.Typography data-testid='wrap-state'>{wrap ? 'Wrapping' : 'Not wrapping'}</Next.Typography>
      </Next.Toolbar>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/toggle-icon-button',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A button with `aria-pressed` that toggles on click and Space; the pressed state takes the accent fill. */
export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const size of SIZES) {
      const rect = byTestId(canvasElement, `bold-${size}`).getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, size).toBeCloseTo(controlSize(size), 0);
    }

    const bold = canvas.getByRole('button', { name: 'Bold md' });
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByRole('button', { name: 'Italic md' })).toHaveAttribute('aria-pressed', 'true');
    const unpressed = getComputedStyle(bold).backgroundColor;
    await userEvent.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'));
    await expect(getComputedStyle(bold).backgroundColor).not.toBe(unpressed);
    await userEvent.keyboard(' ');
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'false'));

    // Controlled: the caller's state follows the toggle.
    await userEvent.click(canvas.getByRole('button', { name: 'Wrap lines' }));
    await waitFor(() => expect(canvas.getByTestId('wrap-state')).toHaveTextContent('Wrapping'));
    await expect(canvas.getByRole('button', { name: 'Wrap lines' })).toHaveAttribute('aria-pressed', 'true');

    const underline = canvas.getByRole('button', { name: 'Underline md' });
    await expect(underline).toBeDisabled();
    await expect(underline).not.toHaveAttribute('title');
    await expectScoped(canvasElement);
  },
};

/** Like IconButton, the label shows in a Tooltip; the story ends with it open. */
export const LabelTooltip: Story = {
  play: async ({ canvasElement }) => {
    const bold = within(canvasElement).getByRole('button', { name: 'Bold md' });
    await userEvent.hover(bold);
    await expectTooltip(bold, 'Bold md');
  },
};
