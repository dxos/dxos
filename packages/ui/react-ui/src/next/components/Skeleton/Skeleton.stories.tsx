//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

/** A placeholder for a contact row: avatar, name and a line of description, then a block-tall action. */
const DefaultStory = () => (
  <>
    <div className='flex gap-2'>
      <Next.Skeleton variant='circle' data-testid='circle' />
      <div className='flex flex-col grow'>
        <Next.Skeleton variant='text' classNames='w-2/3' data-testid='text' />
        <Next.Skeleton variant='text' classNames='w-1/3' />
      </div>
    </div>
    <Next.Skeleton data-testid='default' />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Skeleton',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Shapes follow the size's block and line metrics, pulse, and are hidden from assistive tech. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const canvas = within(sizeRow(canvasElement, size));
      const { block } = GEOMETRY[size];

      const bar = canvas.getByTestId('default');
      await expect(bar).toHaveAttribute('aria-hidden', 'true');
      await expect(bar.getBoundingClientRect().height).toBeCloseTo(block, 0);
      await expect(getComputedStyle(bar).animationName).toBe('nx-skeleton-pulse');

      const circle = canvas.getByTestId('circle').getBoundingClientRect();
      await expect(circle.width).toBeCloseTo(block, 0);
      await expect(circle.height).toBeCloseTo(block, 0);

      // A text bar is shorter than the block and centred in its line by equal margins.
      const text = canvas.getByTestId('text');
      const style = getComputedStyle(text);
      const height = text.getBoundingClientRect().height;
      await expect(height).toBeGreaterThan(0);
      await expect(height).toBeLessThan(block);
      await expect(parseFloat(style.marginTop)).toBeGreaterThan(0);
      await expect(style.marginTop).toBe(style.marginBottom);
    }
  },
};
