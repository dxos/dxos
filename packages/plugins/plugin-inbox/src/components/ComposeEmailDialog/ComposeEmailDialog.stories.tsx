//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ComposeEmailDialog, type ComposeEmailDialogProps } from './ComposeEmailDialog';

const DefaultStory = (props: ComposeEmailDialogProps) => {
  return (
    <Dialog.Root defaultOpen>
      <ComposeEmailDialog {...props} />
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/ComposeEmailDialog',
  component: ComposeEmailDialog,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ComposeEmailDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
