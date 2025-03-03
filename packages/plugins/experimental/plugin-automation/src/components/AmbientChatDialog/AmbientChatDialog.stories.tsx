//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { Config } from '@dxos/client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog, Toolbar } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { AmbientChatDialog } from './AmbientChatDialog';
import translations from '../../translations';

const meta: Meta<typeof AmbientChatDialog> = {
  title: 'plugins/plugin-automation/AmbientChatDialog',
  component: AmbientChatDialog,
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <div>
          <Toolbar.Root>
            <Toolbar.Button onClick={() => setOpen(true)}>Open</Toolbar.Button>
          </Toolbar.Root>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <AmbientChatDialog />
        </Dialog.Root>
      </>
    );
  },
  decorators: [
    withClientProvider({
      config: new Config({
        runtime: {
          client: { edgeFeatures: { signaling: true } },
          services: {
            edge: { url: 'https://edge.dxos.workers.dev/' },
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
          },
        },
      }),
      createIdentity: true,
      createSpace: true,
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof AmbientChatDialog>;

export const Default: Story = {};
