//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

type GridProps = {
  items: string[];
};

const Grid = ({ items }: GridProps) => {
  return <div>Grid</div>;
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-calls/Grid',
  component: Grid,
  render: (args) => <div className='w-[400px] outline outline-red-500'>Test</div>,
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {};
