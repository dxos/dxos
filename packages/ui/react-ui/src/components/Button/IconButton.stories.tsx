//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Tooltip } from '../Tooltip';

import { IconButton, type IconButtonProps } from './IconButton';
import { Button } from './Button';

const DefaultStory = (props: IconButtonProps) => {
  return (
    <Tooltip.Provider>
      <div role='none' className='flex gap-4'>
        <IconButton {...props} />
        <IconButton iconOnly {...props} />
        <Button>{props.label}</Button>
      </div>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/IconButton',
  component: IconButton,
  render: DefaultStory as any,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Bold',
    icon: 'ph--text-b--regular',
  },
};
