//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { withTheme } from '@dxos/react-ui/testing';

import { ProgressPlugin } from '#plugin';
import { translations } from '#translations';

import { ProgressStatusIndicator } from './ProgressStatusIndicator';

/** Seeds the shared {@link AppCapabilities.ProgressRegistry} with two active providers on mount. */
const DefaultStory = () => {
  const progress = useCapability(AppCapabilities.ProgressRegistry);
  useEffect(() => {
    progress.register('sync/inbox', { label: 'Syncing Inbox', total: 120 }).set(42);
    progress.register('sync/calendar', { label: 'Syncing Calendar' }).set(7);
  }, [progress]);

  return <ProgressStatusIndicator />;
};

const meta = {
  title: 'plugins/plugin-progress/ProgressStatusIndicator',
  component: ProgressStatusIndicator,
  render: DefaultStory,
  decorators: [withTheme(), withPluginManager({ plugins: [ProgressPlugin()] })],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof ProgressStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
