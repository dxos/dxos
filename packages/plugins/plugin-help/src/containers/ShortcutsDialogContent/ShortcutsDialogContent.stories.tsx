//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ShortcutsDialogContent } from './ShortcutsDialogContent';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <ShortcutsDialogContent />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-help/containers/ShortcutsDialogContent',
  component: ShortcutsDialogContent,
  render: DefaultStory,
  decorators: [withTheme(), withPluginManager()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ShortcutsDialogContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
