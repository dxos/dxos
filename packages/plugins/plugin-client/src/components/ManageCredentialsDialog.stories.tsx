//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AlertDialog } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ManageCredentialsDialog } from './ManageCredentialsDialog';
import { ClientPlugin } from '../ClientPlugin';
import translations from '../translations';

const Render = () => {
  return (
    <AlertDialog.Root open>
      <AlertDialog.Overlay>
        <ManageCredentialsDialog />
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-client/ManageCredentialsDialog',
  component: ManageCredentialsDialog,
  render: Render,
  decorators: [
    withPluginManager({
      plugins: [
        IntentPlugin(),
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
      ],
    }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ManageCredentialsDialog>;

export const Default: Story = {};
