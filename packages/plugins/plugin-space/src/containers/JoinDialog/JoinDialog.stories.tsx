//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { Dialog } from '@dxos/react-ui';

import { translations } from '#translations';

import { JoinDialog } from './JoinDialog.tsx';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <JoinDialog />
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-space/containers/JoinDialog',
  component: JoinDialog,
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [...CorePlugins.make(), ClientPlugin.make({})],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof JoinDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
