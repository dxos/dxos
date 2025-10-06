//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';

import { Status } from './Status';

const meta = {
  title: 'ui/react-ui-core/Status',
  component: Status,
  decorators: [withTheme],
} satisfies Meta<typeof Status>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal = (props: any) => {
  return (
    <div className='m-5 space-b-5'>
      <Status classNames='block' progress={0} {...props} />
      <Status classNames='block' progress={0.3} {...props} />
      <Status classNames='block' progress={0.7} {...props} />
      <Status classNames='block' progress={1} {...props} />
    </div>
  );
};

export const Indeterminate = (props: any) => {
  return (
    <div className='m-5'>
      <Status classNames='block' indeterminate {...props} />
    </div>
  );
};
