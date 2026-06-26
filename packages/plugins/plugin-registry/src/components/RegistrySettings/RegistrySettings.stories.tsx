//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { RegistrySettings } from './RegistrySettings';

const meta = {
  title: 'plugins/plugin-registry/RegistrySettings',
  component: RegistrySettings,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RegistrySettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: { devPluginUrl: 'http://localhost:3967', devPluginEnabled: false },
    onSettingsChange: () => {},
    activeDevPluginIds: [],
    onEnableDev: async () => {},
    onDisableDev: async () => {},
  },
};

export const Enabled: Story = {
  args: {
    settings: { devPluginUrl: 'http://localhost:3967', devPluginEnabled: true },
    onSettingsChange: () => {},
    activeDevPluginIds: [],
    onEnableDev: async () => {},
    onDisableDev: async () => {},
  },
};
