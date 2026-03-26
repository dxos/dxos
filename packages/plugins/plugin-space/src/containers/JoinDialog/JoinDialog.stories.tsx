//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Dialog } from '@dxos/react-ui';
import { ClientPlugin } from '@dxos/plugin-client';
import { corePlugins } from '@dxos/plugin-testing';

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
  title: 'plugins/plugin-space/containers/JoinDialog',
  component: JoinDialog,
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [...corePlugins(), ClientPlugin({})],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof JoinDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
