//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

import { ResetDialog } from './ResetDialog';

const meta = {
  title: 'apps/composer-app/ResetDialog',
  component: ResetDialog,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ResetDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: true,
  },
};

export const WithRefreshAvailable: Story = {
  args: {
    defaultOpen: true,
    needRefresh: true,
    onRefresh: () => console.log('refresh'),
  },
};

export const WithError: Story = {
  args: {
    defaultOpen: true,
    error: Object.assign(new Error('Failed to load storage'), { name: 'StorageError' }),
    onRefresh: () => console.log('refresh'),
  },
};

export const DevMode: Story = {
  args: {
    defaultOpen: true,
    isDev: true,
  },
};
