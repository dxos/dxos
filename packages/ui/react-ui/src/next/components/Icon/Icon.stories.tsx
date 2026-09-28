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
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, expectDecorativeIconsHidden, expectScoped } from '../../testing.ts';

const DefaultStory = ({ size }: SizeArgs) => (
  <Next.Container gutter='rail' layout='row'>
    <Next.Block rail='start' data-testid={`rail-${size}`}>
      <Next.Icon icon='ph--user--regular' />
    </Next.Block>
    <Next.Typography>Icon {size}</Next.Typography>
    <Next.Block rail='end'>
      <Next.Icon icon='ph--x--regular' label={`Clear ${size}`} />
    </Next.Block>
  </Next.Container>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Icon',
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
 * One icon scale per size (decision 2): the same size in a rail Block as in a control. A labelled icon is an `img`;
 * an unlabelled one is hidden from assistive tech (decision 9).
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const icon = byTestId(canvasElement, `rail-${size}`).querySelector('svg')?.getBoundingClientRect();
      await expect(icon?.width, size).toBeCloseTo(GEOMETRY[size].icon, 0);
      await expect(icon?.height, size).toBeCloseTo(GEOMETRY[size].icon, 0);
    }

    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { name: 'Clear md' })).toBeInTheDocument();
    await expect(canvas.getAllByRole('img')).toHaveLength(SIZES.length);
    await expectDecorativeIconsHidden(canvasElement);
    await expectScoped(canvasElement);
  },
};
