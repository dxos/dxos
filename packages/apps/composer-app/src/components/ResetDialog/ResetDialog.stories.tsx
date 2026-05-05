//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IdbLogStore } from '@dxos/log-store-idb';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
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

const createLogStore = () => new IdbLogStore({ dbName: 'composer-logs-storybook' });

export const Default: Story = {
  args: {
    defaultOpen: true,
    logStore: createLogStore(),
    onRefresh: () => console.log('refresh'),
  },
};

export const WithError: Story = {
  args: {
    defaultOpen: true,
    onReset: async () => console.log('reset'),
    error: Object.assign(new Error('Failed to load storage'), { name: 'StorageError' }),
    logStore: createLogStore(),
    onRefresh: () => console.log('refresh'),
  },
};
