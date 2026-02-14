//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { withLayout, withTheme } from '../../testing';

import { Scrollable, type ScrollableProps } from './Scrollable';

const DefaultStory = (props: ScrollableProps) => {
  return (
    <Scrollable {...props} classNames='bs-full is-full'>
      <div role='none' className={mx('bg-cubes', props.axis === 'vertical' ? 'bs-[200rem]' : 'bs-full is-[200rem]')} />
    </Scrollable>
  );
};

const meta: Meta<typeof Scrollable> = {
  title: 'ui/react-ui-mosaic/Scrollable',
  component: Scrollable,
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  args: {
    axis: 'vertical',
  },
};

export const Horizontal: Story = {
  args: {
    axis: 'horizontal',
  },
};

export const VerticalPadding: Story = {
  args: {
    axis: 'vertical',
    padding: true,
  },
};

export const HorizontalPadding: Story = {
  args: {
    axis: 'horizontal',
    padding: true,
  },
};
