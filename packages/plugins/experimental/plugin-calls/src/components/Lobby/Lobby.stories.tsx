//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Lobby } from './Lobby';
import translations from '../../translations';
import { CallContextProvider } from '../CallContextProvider';

const meta: Meta<typeof Lobby> = {
  title: 'plugins/plugin-calls/Lobby',
  component: Lobby,
  // TODO(burdon): Create decorator for CallContextProvider.
  render: () => {
    const roomId = useMemo(() => PublicKey.random(), []);
    return (
      <CallContextProvider roomId={roomId}>
        <div className='flex w-[30rem] h-full overflow-hidden'>
          <Lobby />
        </div>
      </CallContextProvider>
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
