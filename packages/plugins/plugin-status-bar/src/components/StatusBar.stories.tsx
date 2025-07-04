//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

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

export const Default = {};

const meta: Meta<typeof StatusBar> = {
  title: 'plugins/plugin-status/StatusBar',
  component: StatusBar as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};

export default meta;
