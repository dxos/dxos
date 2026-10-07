//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, expectScoped } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Container } from '../Container/Container.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as Typography from '../Typography/Typography.tsx';
import { Block } from './Block.tsx';

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Container gutter='rail' layout='row' data-testid={`row-${size}`}>
      <Block rail='start' data-testid={`start-${size}`}>
        <Icon.Icon icon='ph--circle--regular' />
      </Block>
      <Typography.Text>Block</Typography.Text>
      <Block rail='end' data-testid={`end-${size}`}>
        <Icon.Icon icon='ph--dots-three--regular' />
      </Block>
    </Container>
    <Container gutter='rail' layout='row'>
      <Block rail='start' compact data-testid={`compact-${size}`}>
        <Icon.Icon icon='ph--star--regular' />
      </Block>
      <Typography.Text>Compact</Typography.Text>
    </Container>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Block',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A Block is a block-sized square that centres its icon; rail Blocks fill their row's gutters; a compact one is only icon-tall. */
export const Test: Story = {
  args: { allSizes: true },
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
      const compact = byTestId(canvasElement, `compact-${size}`).getBoundingClientRect();
      const compactIcon = byTestId(canvasElement, `compact-${size}`).querySelector('svg')?.getBoundingClientRect();
      await expect(compact.width, `compact-${size} width`).toBeCloseTo(block, 0);
      await expect(compact.height, `compact-${size} height`).toBeCloseTo(compactIcon?.height ?? 0, 0);
      await expect(compact.height).toBeLessThan(block);
    }
    await expectScoped(canvasElement);
  },
};
