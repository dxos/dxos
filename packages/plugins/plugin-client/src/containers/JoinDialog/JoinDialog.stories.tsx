//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '../../ClientPlugin';
import { translations } from '../../translations';

import { JoinDialog } from './JoinDialog';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <JoinDialog />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-client/containers/JoinDialog',
  component: JoinDialog,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ createIdentity: true }),
    withPluginManager({
      plugins: [RuntimePlugin(), OperationPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof JoinDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
