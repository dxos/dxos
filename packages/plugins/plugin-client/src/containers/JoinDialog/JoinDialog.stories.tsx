//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Next } from '@dxos/react-ui';

import { ClientPlugin } from '#plugin';
import { translations } from '#translations';

import { JoinDialog } from './JoinDialog.tsx';

const DefaultStory = () => (
  <Next.Dialog.Root defaultOpen>
    <JoinDialog />
  </Next.Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-client/containers/JoinDialog',
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
