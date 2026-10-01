//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectEndCell, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Field.Root>
      <Next.Field.Label>Password</Next.Field.Label>
      <Next.PasswordInput defaultValue='hunter2' autoComplete='current-password' data-testid={`password-${size}`} />
      <Next.Field.HelperText>At least 8 characters.</Next.Field.HelperText>
    </Next.Field.Root>
    <Next.Input aria-label='Note' data-testid={`input-${size}`} />
    <Next.Field.Root>
      <Next.Field.Label>API key</Next.Field.Label>
      <Next.PasswordInput ignorePasswordManagers placeholder='sk-…' data-testid={`key-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root disabled>
      <Next.Field.Label>Locked</Next.Field.Label>
      <Next.PasswordInput defaultValue='secret' data-testid={`disabled-${size}`} />
    </Next.Field.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/PasswordInput',
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
 * The row is a control as wide as an Input at every size, the toggle inset at its end; the Field wires label and
 * description to the input. The toggle reveals and hides the text and renames itself; `ignorePasswordManagers` sets
 * the managers' opt-out attributes.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = byTestId(canvasElement, `password-${size}`);
      const rect = row.getBoundingClientRect();
      await expect(rect.height, `${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, `${size} width`).toBeCloseTo(
        byTestId(canvasElement, `input-${size}`).getBoundingClientRect().width,
        0,
      );
      await expect(parseFloat(getComputedStyle(row).marginTop), `${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
      const toggle = within(row).getByRole('button', { name: 'Show password' });
      await expectEndCell(toggle.querySelector('svg'), rect.right, size, `${size} toggle`);
    }
    await expectScoped(canvasElement);

    const md = sizeRow(canvasElement, 'md');
    const canvas = within(md);
    const input = canvas.getByLabelText('Password');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(input).toHaveAccessibleDescription('At least 8 characters.');
    await expect(input).toHaveAttribute('autocomplete', 'current-password');

    const row = byTestId(md, 'password-md');
    await userEvent.click(within(row).getByRole('button', { name: 'Show password' }));
    await waitFor(() => expect(input).toHaveAttribute('type', 'text'));
    await expect(input).toHaveValue('hunter2');
    await userEvent.click(within(row).getByRole('button', { name: 'Hide password' }));
    await waitFor(() => expect(input).toHaveAttribute('type', 'password'));

    await expect(canvas.getByLabelText('API key')).toHaveAttribute('data-1p-ignore');
    await expect(canvas.getByLabelText('Locked')).toBeDisabled();
    await expect(within(byTestId(md, 'disabled-md')).getByRole('button', { name: 'Show password' })).toBeDisabled();
  },
};
