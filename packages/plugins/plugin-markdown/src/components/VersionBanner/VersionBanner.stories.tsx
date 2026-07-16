//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { VersionBanner } from './VersionBanner';

const meta = {
  title: 'plugins/plugin-markdown/components/VersionBanner',
  component: VersionBanner,
  decorators: [withTheme()],
  parameters: {
    translations,
  },
} satisfies Meta<typeof VersionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checkpoint: Story = {
  args: {
    mode: 'checkpoint',
    name: 'v2 outline',
    detail: '2 days ago',
    onRestore: () => console.log('restore'),
    onBranchFrom: () => console.log('branch from'),
    onClose: () => console.log('close'),
  },
};

export const Branch: Story = {
  args: {
    mode: 'branch',
    name: 'agent-draft',
    detail: 'anchored at v2 outline',
    onMerge: () => console.log('merge'),
    onCompare: () => console.log('compare'),
    onClose: () => console.log('close'),
  },
};
