//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { LogBuffer } from '@dxos/log';
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
    logBuffer: new LogBuffer(),
    onRefresh: () => console.log('refresh'),
  },
};

export const WithError: Story = {
  args: {
    defaultOpen: true,
    onReset: async () => console.log('reset'),
    error: Object.assign(new Error('Failed to load storage'), { name: 'StorageError' }),
    logBuffer: new LogBuffer(),
    onRefresh: () => console.log('refresh'),
  },
};
