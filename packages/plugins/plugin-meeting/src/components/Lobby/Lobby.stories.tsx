//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Lobby } from './Lobby';
import { MeetingPlugin } from '../../MeetingPlugin';
import translations from '../../translations';

const meta: Meta<typeof Lobby> = {
  title: 'plugins/plugin-calls/Lobby',
  component: Lobby,
  render: () => {
    return (
      <div className='flex w-[30rem] h-full overflow-hidden'>
        <Lobby roomId='test' />
      </div>
    );
  },
  decorators: [
    withClientProvider({ createIdentity: true }),
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
    withPluginManager({ plugins: [MeetingPlugin()] }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Lobby>;

export const Default: Story = {
  args: {},
};
