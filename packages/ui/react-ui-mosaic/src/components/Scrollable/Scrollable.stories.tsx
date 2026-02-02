//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Scrollable, type ScrollableProps } from './Scrollable';

const DefaultStory = (props: ScrollableProps) => {
  return (
    <Scrollable {...props} classNames='bs-full is-full'>
      <div
        role='none'
        style={
          {
            '--checker-light': '#222',
            '--checker-dark': '#333',
          } as any
        }
        className={mx(
          props.axis === 'vertical' ? 'bs-[200rem]' : 'bs-full is-[200rem]',
          'bg-[var(--checker-light)]',
          'bg-repeat bg-[length:256px_256px]',
          'bg-[linear-gradient(45deg,_var(--checker-dark)_25%,_transparent_25%,_transparent_75%,_var(--checker-dark)_75%,_var(--checker-dark)),linear-gradient(45deg,_var(--checker-dark)_25%,_transparent_25%,_transparent_75%,_var(--checker-dark)_75%,_var(--checker-dark))]',
          'bg-[position:0_0,128px_128px]',
        )}
      />
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
