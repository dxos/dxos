//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { Mailbox, DiscordLogo, Lightning } from '@phosphor-icons/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { StatusBar } from './StatusBar';

export default {
  title: 'plugin-status/StatusBar',
  component: StatusBar,
  actions: { argTypesRegex: '^on.*' },
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Normal = (_props: any) => (
  <>
    <StatusBar.Container>
      <StatusBar.EndContent>
        <StatusBar.Button>
          <Mailbox />
          <StatusBar.Text>Quick feedback</StatusBar.Text>
        </StatusBar.Button>
        <a href='https://discord.gg/' target='_blank' rel='noopener noreferrer'>
          <StatusBar.Button>
            <DiscordLogo />
            <StatusBar.Text>Join us on Discord</StatusBar.Text>
          </StatusBar.Button>
        </a>
        <StatusBar.Item>
          <Lightning />
          <StatusBar.Text>Online</StatusBar.Text>
        </StatusBar.Item>
      </StatusBar.EndContent>
    </StatusBar.Container>
  </>
);
