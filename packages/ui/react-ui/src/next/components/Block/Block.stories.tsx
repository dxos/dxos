//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, expectScoped } from '../../testing.ts';

const DefaultStory = () => (
  <div className='nx-scope @container w-[32rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail'>
      {SIZES.map((size) => (
        <Next.Container key={size} size={size} gutter='rail' layout='row' data-testid={`row-${size}`}>
          <Next.Block rail='start' data-testid={`start-${size}`}>
            <Next.Icon icon='ph--circle--regular' />
          </Next.Block>
          <Next.Typography>Block {size}</Next.Typography>
          <Next.Block rail='end' data-testid={`end-${size}`}>
            <Next.Icon icon='ph--dots-three--regular' />
          </Next.Block>
        </Next.Container>
      ))}
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/block',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A Block is a block-sized square that centres its icon; rail Blocks fill their row's gutters. */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { block } = GEOMETRY[size];
      const start = byTestId(canvasElement, `start-${size}`);
      const rect = start.getBoundingClientRect();
      await expect(rect.width, `start-${size} width`).toBeCloseTo(block, 0);
      await expect(rect.height, `start-${size} height`).toBeCloseTo(block, 0);
      const icon = start.querySelector('svg')?.getBoundingClientRect();
      await expect(icon && centreY(icon), `start-${size} icon centre`).toBeCloseTo(centreY(rect), 0);
      await expect(icon && icon.left + icon.width / 2).toBeCloseTo(rect.left + rect.width / 2, 0);
      const row = byTestId(canvasElement, `row-${size}`).getBoundingClientRect();
      await expect(row.height, `row-${size} height`).toBeCloseTo(block, 0);
      await expect(rect.left, `start-${size} left`).toBeCloseTo(row.left, 0);
      await expect(byTestId(canvasElement, `end-${size}`).getBoundingClientRect().right).toBeCloseTo(row.right, 0);
    }
    await expectScoped(canvasElement);
  },
};
