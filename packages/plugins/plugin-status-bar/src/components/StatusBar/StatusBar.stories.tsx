//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Icon, IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { StatusBar } from './index';

export const DefaultStory = () => (
  <StatusBar.EndContent>
    <StatusBar.Button>
      <Icon icon='ph--mailbox--regular' />
      <StatusBar.Text>Quick feedback</StatusBar.Text>
    </StatusBar.Button>
    <a href='https://dxos.org/discord' target='_blank' rel='noopener noreferrer'>
      <StatusBar.Button>
        <Icon icon='ph--discord-logo--regular' />
        <StatusBar.Text>Join us on Discord</StatusBar.Text>
      </StatusBar.Button>
    </a>
    <StatusBar.Item>
      <IconButton variant='ghost' icon='ph--lightning--regular' iconOnly label='Online' />
    </StatusBar.Item>
  </StatusBar.EndContent>
);

const meta = {
  title: 'plugins/plugin-status-bar/components/StatusBar',
  component: StatusBar as any,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof StatusBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
