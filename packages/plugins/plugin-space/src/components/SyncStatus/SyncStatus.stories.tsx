//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';


import { translations } from '../../translations';

import { SyncStatusIndicator } from './SyncStatus';

const meta = {
  title: 'plugins/plugin-space/SyncStatusIndicator',
  component: SyncStatusIndicator,
    parameters: {
    translations,
    layout: 'centered',
  },
} satisfies Meta<typeof SyncStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

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
