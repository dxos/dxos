//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectEndCell, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Field from '../Field/Field.tsx';
import { Input } from '../Input/Input.tsx';
import { NumberInput } from './NumberInput.tsx';

const DefaultStory = ({ size }: SizeArgs) => {
  const [value, setValue] = useState('8');
  return (
    <>
      <Field.Root>
        <Field.Label>Quantity</Field.Label>
        <NumberInput min={0} max={10} value={value} onValueChange={setValue} data-testid={`number-${size}`} />
        <Field.HelperText>
          Between 0 and 10: <output data-testid={`number-${size}-value`}>{value}</output>
        </Field.HelperText>
      </Field.Root>
      <Input aria-label='Note' data-testid={`input-${size}`} />
      <Field.Root>
        <Field.Label>Price</Field.Label>
        <NumberInput
          defaultValue='1250'
          step={0.5}
          formatOptions={{ style: 'currency', currency: 'USD' }}
          data-testid={`currency-${size}`}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>Ratio</Field.Label>
        <NumberInput defaultValue='0.5' stepper={false} data-testid={`bare-${size}`} />
      </Field.Root>
      <Field.Root disabled>
        <Field.Label>Locked</Field.Label>
        <NumberInput defaultValue='3' data-testid={`disabled-${size}`} />
      </Field.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/NumberInput',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The row is a control as wide as an Input at every size, with the compact stepper buttons abutting, inset at its end; the Field label
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
      // The last stepper centres on the end cell, the pair's other half sitting before it.
      await expectEndCell(increment.querySelector('svg'), rect.right, size, `${size} stepper`);
      // Compact steppers: the pair abuts, each narrower than a block cell.
      const decrement = within(row).getByRole('button', { name: 'Decrement' });
      await expect(decrement, `${size} decrement compact`).toHaveAttribute('data-compact');
      await expect(increment.getBoundingClientRect().left, `${size} stepper gap`).toBeCloseTo(
        decrement.getBoundingClientRect().right,
        0,
      );
      for (const button of [decrement, increment]) {
        await expect(button.getBoundingClientRect().width, `${size} stepper width`).toBeLessThan(GEOMETRY[size].block);
        await expect(button.getBoundingClientRect().width).toBeCloseTo(
          GEOMETRY[size].icon + 2 * GEOMETRY[size].inset,
          0,
        );
      }
    }
    await expectScoped(canvasElement);

    const md = sizeRow(canvasElement, 'md');
    const canvas = within(md);
    const value = byTestId(md, 'number-md-value');
    const input = canvas.getByRole('spinbutton', { name: 'Quantity' });
    await expect(input).toHaveAccessibleDescription('Between 0 and 10: 8');
    await expect(input).toHaveAttribute('aria-valuemax', '10');
    await expect(getComputedStyle(input).fontVariantNumeric).toContain('tabular-nums');

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
