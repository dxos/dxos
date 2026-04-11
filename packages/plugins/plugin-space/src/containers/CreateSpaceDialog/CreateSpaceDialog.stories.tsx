//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { CreateSpaceDialog } from './CreateSpaceDialog';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <CreateSpaceDialog />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-space/containers/CreateSpaceDialog',
  component: CreateSpaceDialog,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [RuntimePlugin(), OperationPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof CreateSpaceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
