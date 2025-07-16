//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { SyncStatusIndicator } from './SyncStatus';
import { translations } from '../../translations';

const meta: Meta = {
  title: 'plugins/plugin-space/SyncStatusIndicator',
  component: SyncStatusIndicator,
  decorators: [withTheme],
  parameters: {
    translations,
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof SyncStatusIndicator>;

export const Default: Story = {
  args: {
    state: {},
    saved: true,
  },
};

export const Saving: Story = {
  args: {
    state: {},
    saved: false,
  },
};
