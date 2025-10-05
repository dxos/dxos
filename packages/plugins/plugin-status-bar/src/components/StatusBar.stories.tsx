//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { Icon } from '@dxos/react-ui';

import { StatusBar } from './StatusBar';

export const DefaultStory = () => (
  <div>
    <StatusBar.EndContent>
      <StatusBar.Button>
        <Icon icon='ph--mailbox--regular' size={4} />
        <StatusBar.Text>Quick feedback</StatusBar.Text>
      </StatusBar.Button>
      <a href='https://dxos.org/discord' target='_blank' rel='noopener noreferrer'>
        <StatusBar.Button>
          <Icon icon='ph--discord-logo--regular' size={4} />
          <StatusBar.Text>Join us on Discord</StatusBar.Text>
        </StatusBar.Button>
      </a>
      <StatusBar.Item>
        <Icon icon='ph--lightning--regular' size={4} />
        <StatusBar.Text>Online</StatusBar.Text>
      </StatusBar.Item>
    </StatusBar.EndContent>
  </div>
);

const meta = {
  title: 'plugins/plugin-status/StatusBar',
  component: StatusBar as any,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    chromatic: { disableSnapshot: false },
  },
} satisfies Meta<typeof StatusBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
