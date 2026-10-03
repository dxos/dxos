//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Checkbox from './Checkbox.tsx';

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Checkbox.Checkbox label='Subscribe' defaultChecked data-testid={`checkbox-${size}`} />
    <Checkbox.Checkbox label='Some selected' checked='indeterminate' />
    <Checkbox.Checkbox aria-label='Unlabelled' />
    <Checkbox.Checkbox label='Disabled' disabled />
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Checkbox',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
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
