//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, centreY, expectScoped, sizeRow } from '../../testing.ts';

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Checkbox label='Subscribe' defaultChecked data-testid={`checkbox-${size}`} />
    <Next.Checkbox label='Some selected' checked='indeterminate' />
    <Next.Checkbox aria-label='Unlabelled' />
    <Next.Checkbox label='Disabled' disabled />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Checkbox',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The box is icon-sized, centred in its block and in a block-sized cell at the content edge (follow-up 19); clicking
 * the label toggles the hidden native checkbox, which carries the accessible name.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { block, icon } = GEOMETRY[size];
      const checkbox = byTestId(canvasElement, `checkbox-${size}`);
      const control = checkbox.querySelector<HTMLElement>('[data-part="control"]');
      const box = control?.getBoundingClientRect();
      const root = checkbox.getBoundingClientRect();
      await expect(box?.height, size).toBeCloseTo(icon, 0);
      await expect(box && centreY(box), size).toBeCloseTo(centreY(root), 0);
      await expect(root.height, size).toBeCloseTo(block, 0);

      const style = control ? getComputedStyle(control) : undefined;
      const cellLeft = (box?.left ?? Number.NaN) - parseFloat(style?.marginLeft ?? '');
      const cellWidth =
        (box?.width ?? Number.NaN) + parseFloat(style?.marginLeft ?? '') + parseFloat(style?.marginRight ?? '');
      await expect(cellWidth, `${size} cell`).toBeCloseTo(block, 0);
      await expect(cellLeft, `${size} cell left`).toBeCloseTo(root.left, 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const checkbox = canvas.getByRole('checkbox', { name: 'Subscribe' });
    const control = byTestId(canvasElement, 'checkbox-md').querySelector('[data-part="control"]');
    await expect(checkbox).toBeChecked();
    await expect(control).toHaveAttribute('data-state', 'checked');
    await userEvent.click(byTestId(canvasElement, 'checkbox-md'));
    await waitFor(() => expect(checkbox).not.toBeChecked());
    await expect(control).toHaveAttribute('data-state', 'unchecked');

    await expect(canvas.getByRole('checkbox', { name: 'Unlabelled' })).not.toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: 'Disabled' })).toBeDisabled();
    await expect(
      canvas
        .getByText('Some selected')
        .closest('[data-scope="checkbox"][data-part="root"]')
        ?.querySelector('[data-part="control"]'),
    ).toHaveAttribute('data-state', 'indeterminate');
    await expectScoped(canvasElement);
  },
};
