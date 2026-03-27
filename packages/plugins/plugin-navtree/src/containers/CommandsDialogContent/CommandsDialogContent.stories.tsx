//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Dialog } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';

import { NavTreePlugin } from '../../NavTreePlugin';
import { translations } from '../../translations';

import { CommandsDialogContent } from './CommandsDialogContent';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <CommandsDialogContent />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-navtree/containers/CommandsDialogContent',
  component: CommandsDialogContent,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), StorybookPlugin({}), NavTreePlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof CommandsDialogContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
