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
import { GEOMETRY, byTestId, centreY, expectScoped } from '../../testing.ts';

const DefaultStory = () => (
  <div className='nx-scope @container flex flex-col w-[28rem] border border-separator' data-size='md'>
    {SIZES.map((size) => (
      <Next.Container key={size} size={size} gutter='rail' level='base' data-testid={`host-${size}`}>
        <Next.Checkbox label={`Subscribe ${size}`} defaultChecked data-testid={`checkbox-${size}`} />
      </Next.Container>
    ))}
    <Next.Container gutter='rail' level='base'>
      <Next.Checkbox label='Some selected' checked='indeterminate' />
      <Next.Checkbox aria-label='Unlabelled' />
      <Next.Checkbox label='Disabled' disabled />
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/checkbox',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The box is icon-sized, centred in its block and in a block-sized cell at the content edge (follow-up 19). */
export const Sizes: Story = {
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
  },
};

/** Clicking the label toggles the hidden native checkbox, which carries the accessible name. */
export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', { name: 'Subscribe md' });
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
