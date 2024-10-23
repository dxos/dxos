//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { StatusBar } from './StatusBar';

export const Story = () => (
  <StatusBar.Container>
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
  </StatusBar.Container>
);

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-status/StatusBar',
  // component: StatusBar,
  // actions: { argTypesRegex: '^on.*' },
  decorators: [withTheme],
  render: Story,
  parameters: { chromatic: { disableSnapshot: false } },
};

export default meta;
