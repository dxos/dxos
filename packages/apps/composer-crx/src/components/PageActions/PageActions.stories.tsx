//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import browser from 'webextension-polyfill';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PAGE_ACTIONS_STORAGE_KEY, type PageActionsRegistry } from '../../core';
import { translations } from '../../translations';
import { PageActions } from './PageActions';

// Seed the cached registry the component reads from `browser.storage` (stubbed in Storybook).
const registry: PageActionsRegistry = {
  fetchedAt: '2024-01-01T00:00:00.000Z',
  actions: [
    {
      id: 'demo-note',
      label: 'Add note',
      icon: 'ph--note--regular',
      urlPatterns: ['https://*/*'],
      extractor: { name: 'snapshot' },
      operation: 'demo/add-note',
      contexts: ['popup'],
    },
    {
      id: 'demo-clip',
      label: 'Clip page',
      icon: 'ph--scissors--regular',
      urlPatterns: ['https://*/*'],
      extractor: { name: 'snapshot' },
      operation: 'demo/clip-page',
      contexts: ['popup'],
    },
  ],
};

const meta = {
  title: 'apps/composer-crx/PageActions',
  component: PageActions,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'p-1' })],
  parameters: { translations },
  loaders: [
    async () => {
      await browser.storage.local.set({ [PAGE_ACTIONS_STORAGE_KEY]: registry });
      return {};
    },
  ],
} satisfies Meta<typeof PageActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabId: 1,
    tabUrl: 'https://example.com',
  },
};
