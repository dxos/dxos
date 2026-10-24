//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing/index.ts';
import * as ColorPicker from './ColorPicker.tsx';

type StoryArgs = { defaultValue?: string; disabled?: boolean } & Pick<ColorPicker.TriggerProps, 'tones'>;

/** A text box with the picker's swatch as its end decoration, as a form's color field lays it out. */
const DefaultStory = ({ defaultValue, disabled, tones }: StoryArgs) => {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className='flex flex-col gap-2 w-72'>
      <ColorPicker.Root value={value} onValueChange={setValue} disabled={disabled}>
        <ColorPicker.Input placeholder='None' data-testid='color.input' end={<ColorPicker.Trigger tones={tones} />} />
      </ColorPicker.Root>
      <code data-testid='color.value'>{value ?? 'unset'}</code>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/ColorPicker',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: '#3b82f6' },
};

export const Unset: Story = {};

/** The mid tones only, for a palette without its near-white and near-black ends. */
export const MidTones: Story = {
  args: { defaultValue: '#3b82f6', tones: [300, 400, 500, 600, 700, 800, 900] },
};

/** Typing sets any CSS color; clearing the box leaves the value unset rather than a fallback color. */
export const Typed: Story = {
  args: { defaultValue: '#3b82f6' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // An adorned input puts its test id on the frame around it.
    const input = within(canvas.getByTestId('color.input')).getByRole('textbox');
    await userEvent.clear(input);
    await expect(canvas.getByTestId('color.value')).toHaveTextContent('unset');
    await userEvent.type(input, 'tomato');
    await expect(canvas.getByTestId('color.value')).toHaveTextContent('tomato');
  },
};

/** A swatch writes its tone's resolved color (not a `var()`), and the trigger's square takes it. */
export const Swatch: Story = {
  args: { tones: [400, 600] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pick color' }));
    await userEvent.click(await screen.findByRole('tab', { name: 'Swatches' }));
    await userEvent.click(await screen.findByRole('button', { name: 'red-600' }));
    await waitFor(() => expect(canvas.getByTestId('color.value').textContent).toMatch(/^(oklch|#|rgb)/));
    await expect(screen.queryByRole('button', { name: 'red-500' })).toBeNull();
  },
};
