//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped } from '../../testing.ts';

type StoryArgs = {
  /** Marks the Website field invalid. */
  invalid?: boolean;
};

const DefaultStory = ({ invalid }: StoryArgs) => (
  <div className='nx-scope @container flex flex-col w-[28rem] border border-separator' data-size='md'>
    {SIZES.map((size) => (
      <Next.Container key={size} size={size} gutter='rail' level='base'>
        <Next.Field.Root data-testid={`field-${size}`}>
          <Next.Field.Label>Email {size}</Next.Field.Label>
          <Next.Input data-testid={`field-input-${size}`} />
          <Next.Field.HelperText>We never share it.</Next.Field.HelperText>
        </Next.Field.Root>
      </Next.Container>
    ))}
    <Next.Container gutter='rail' level='base'>
      <Next.Field.Root invalid={invalid} data-testid='website'>
        <Next.Field.Header>
          <Next.Field.Label>Website</Next.Field.Label>
          <Next.IconButton icon='ph--x--regular' label='Clear website' />
        </Next.Field.Header>
        <Next.Input defaultValue='not a url' />
        <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
      </Next.Field.Root>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/field',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** In a Field stack the field pads its control out to a block (finding 11). */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const input = byTestId(canvasElement, `field-input-${size}`);
      await expect(input.getBoundingClientRect().height, size).toBeCloseTo(controlSize(size), 0);
      await expect(parseFloat(getComputedStyle(input).marginTop), size).toBeCloseTo(GEOMETRY[size].inset, 0);
      await expect(parseFloat(getComputedStyle(input).marginBottom), size).toBeCloseTo(GEOMETRY[size].inset, 0);
    }
  },
};

/** The field wires its label and helper text to the control; ErrorText renders only while invalid. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Email md' });
    await expect(input).toBe(byTestId(canvasElement, 'field-input-md'));
    await expect(input).toHaveAccessibleDescription('We never share it.');
    await expect(byTestId(canvasElement, 'field-md').dataset.scope).toBe('field');
    await expect(canvas.queryByText('Enter a valid URL.')).toBeNull();
    await expect(canvas.getByRole('textbox', { name: 'Website' })).not.toHaveAttribute('aria-invalid', 'true');
    await expectScoped(canvasElement);
  },
};

export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Enter a valid URL.')).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Website' })).toHaveAttribute('aria-invalid', 'true');
    await expect(byTestId(canvasElement, 'website')).toHaveAttribute('data-invalid');
  },
};
