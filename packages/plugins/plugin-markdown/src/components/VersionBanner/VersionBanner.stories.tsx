//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { VersionBanner } from './VersionBanner';

const meta = {
  title: 'plugins/plugin-markdown/components/VersionBanner',
  component: VersionBanner,
  decorators: [withTheme()],
  parameters: {
    translations: [...translations, ...spaceTranslations],
  },
} satisfies Meta<typeof VersionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checkpoint: Story = {
  args: {
    mode: 'checkpoint',
    name: 'v2 outline',
    detail: '2 days ago',
    onRestore: fn(),
    onBranchFrom: fn(),
    onClose: fn(),
  },
};

export const Branch: Story = {
  args: {
    mode: 'branch',
    name: 'agent-draft',
    detail: 'anchored at v2 outline',
    onMerge: fn(),
    onCompare: fn(),
    onClose: fn(),
  },
};

export const Fork: Story = {
  args: {
    mode: 'fork',
    name: 'agent-draft',
    detail: '2 days ago',
    onClose: fn(),
  },
};
