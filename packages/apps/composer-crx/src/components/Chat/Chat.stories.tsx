//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Chat } from './Chat';

// The agent hooks are stubbed in Storybook (see .storybook/mocks), so this renders the initial
// no-messages state: an empty streaming thread over the editor input.
const meta = {
  title: 'apps/composer-crx/Chat',
  component: Chat,
  render: (args) => (
    <div className='flex w-[24rem] h-[36rem]'>
      <Chat {...args} />
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof Chat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    url: 'https://example.com',
  },
};
