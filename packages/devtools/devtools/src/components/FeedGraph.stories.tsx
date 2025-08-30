//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { FeedGraph } from './FeedGraph';

const meta = {
  title: 'devtools/devtools/FeedGraph',
  component: FeedGraph,
  decorators: [withTheme],
  argTypes: {},
} satisfies Meta<typeof FeedGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    return (
      <div>
        <FeedGraph />
      </div>
    );
  },
};
