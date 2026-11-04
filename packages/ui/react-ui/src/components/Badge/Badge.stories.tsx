//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Flex } from '../../layout/Flex/Flex.tsx';
import { withLayout, withTheme } from '../../testing/index.ts';
import * as Avatar from '../Avatar/Avatar.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as Badge from './Badge.tsx';

const CORNERS: Badge.Corner[] = ['top-start', 'top-end', 'bottom-start', 'bottom-end'];

const DefaultStory = () => (
  <Flex align='center' gap='lg'>
    {CORNERS.map((corner) => (
      <Badge.Root key={corner} data-testid={`root-${corner}`}>
        <Avatar.Root hue='indigo' fallback='Ada Lovelace' label='Ada Lovelace' />
        <Badge.Mark corner={corner} data-testid={`mark-${corner}`}>
          <Avatar.Root fill variant='square' hue='purple' icon='ph--robot--regular' aria-hidden />
        </Badge.Mark>
      </Badge.Root>
    ))}
    <Badge.Root>
      <Icon.Icon icon='ph--file--regular' size='lg' />
      <Badge.Mark>
        <Icon.Icon icon='ph--lock--fill' />
      </Badge.Mark>
    </Badge.Root>
  </Flex>
);

const meta = {
  title: 'ui/react-ui-core/components/Badge',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4' }), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const corner of CORNERS) {
      const root = canvas.getByTestId(`root-${corner}`).getBoundingClientRect();
      const mark = canvas.getByTestId(`mark-${corner}`).getBoundingClientRect();
      await expect(mark.width).toBeCloseTo(root.width / 2, 0);
      const centreX = mark.left + mark.width / 2;
      const centreY = mark.top + mark.height / 2;
      await expect(
        corner.endsWith('end') ? centreX > root.right - root.width / 4 : centreX < root.left + root.width / 4,
      ).toBe(true);
      await expect(
        corner.startsWith('bottom') ? centreY > root.bottom - root.height / 4 : centreY < root.top + root.height / 4,
      ).toBe(true);
    }
  },
};
