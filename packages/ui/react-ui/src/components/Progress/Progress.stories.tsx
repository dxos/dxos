//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Progress } from './Progress';

const meta = {
  title: 'ui/react-ui-core/components/Progress',
  component: Progress.Bar,
  decorators: [withTheme()],
} satisfies Meta<typeof Progress.Bar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  render: (props) => {
    return (
      <div className='m-5 flex flex-col gap-5'>
        <Progress.Bar classNames='block' progress={0} {...props} />
        <Progress.Bar classNames='block' progress={0.3} {...props} />
        <Progress.Bar classNames='block' progress={0.7} {...props} />
        <Progress.Bar classNames='block' progress={1} {...props} />
      </div>
    );
  },
};

export const Indeterminate: Story = {
  render: (props) => {
    return (
      <div className='m-5'>
        <Progress.Bar classNames='block' indeterminate {...props} />
      </div>
    );
  },
};
