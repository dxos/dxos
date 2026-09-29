//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';

const DefaultStory = ({ size }: SizeArgs) => {
  const [value, setValue] = useState('8');
  return (
    <>
      <Next.Field.Root>
        <Next.Field.Label>Quantity</Next.Field.Label>
        <Next.NumberInput min={0} max={10} value={value} onValueChange={setValue} data-testid={`number-${size}`} />
        <Next.Field.HelperText>
          Between 0 and 10: <output data-testid={`number-${size}-value`}>{value}</output>
        </Next.Field.HelperText>
      </Next.Field.Root>
      <Next.Input aria-label='Note' data-testid={`input-${size}`} />
      <Next.Field.Root>
        <Next.Field.Label>Price</Next.Field.Label>
        <Next.NumberInput
          defaultValue='1250'
          step={0.5}
          formatOptions={{ style: 'currency', currency: 'USD' }}
          data-testid={`currency-${size}`}
        />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Label>Ratio</Next.Field.Label>
        <Next.NumberInput defaultValue='0.5' stepper={false} data-testid={`bare-${size}`} />
      </Next.Field.Root>
      <Next.Field.Root disabled>
        <Next.Field.Label>Locked</Next.Field.Label>
        <Next.NumberInput defaultValue='3' data-testid={`disabled-${size}`} />
      </Next.Field.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/NumberInput',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The row is a control as wide as an Input at every size, with the stepper buttons inset at its end; the Field label
 * names the input (`spinbutton`). The buttons and ArrowUp/Down step by `step` and stop at `max`/`min`; typing past
 * `max` clamps on blur.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = byTestId(canvasElement, `number-${size}`);
      const rect = row.getBoundingClientRect();
      await expect(rect.height, `${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, `${size} width`).toBeCloseTo(
        byTestId(canvasElement, `input-${size}`).getBoundingClientRect().width,
        0,
      );
      await expect(parseFloat(getComputedStyle(row).marginTop), `${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
      const increment = within(row).getByRole('button', { name: 'Increment' });
      await expect(increment.getBoundingClientRect().right, `${size} stepper end`).toBeCloseTo(
        rect.right - GEOMETRY[size].inset,
        0,
      );
    }
    await expectScoped(canvasElement);

    const md = sizeRow(canvasElement, 'md');
    const canvas = within(md);
    const value = byTestId(md, 'number-md-value');
    const input = canvas.getByRole('spinbutton', { name: 'Quantity' });
    await expect(input).toHaveAccessibleDescription('Between 0 and 10: 8');
    await expect(input).toHaveAttribute('aria-valuemax', '10');

    const row = byTestId(md, 'number-md');
    await userEvent.click(within(row).getByRole('button', { name: 'Increment' }));
    await waitFor(() => expect(value).toHaveTextContent('9'));
    await userEvent.click(within(row).getByRole('button', { name: 'Increment' }));
    await userEvent.click(within(row).getByRole('button', { name: 'Increment' }));
    await waitFor(() => expect(value).toHaveTextContent('10'));
    await expect(within(row).getByRole('button', { name: 'Increment' })).toBeDisabled();
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(value).toHaveTextContent('8'));

    await userEvent.clear(input);
    await userEvent.type(input, '42');
    await userEvent.tab();
    await waitFor(() => expect(value).toHaveTextContent('10'));

    await expect(canvas.getByRole('spinbutton', { name: 'Price' })).toHaveValue('$1,250.00');
    await expect(within(byTestId(md, 'bare-md')).queryByRole('button')).toBeNull();
    await expect(canvas.getByRole('spinbutton', { name: 'Locked' })).toBeDisabled();
    await expect(getComputedStyle(byTestId(md, 'disabled-md')).opacity).toBe('0.5');
  },
};
