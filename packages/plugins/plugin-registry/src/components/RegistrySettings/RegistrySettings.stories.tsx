//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { RegistrySettings } from './RegistrySettings.tsx';

const meta = {
  title: 'plugins/plugin-registry/components/RegistrySettings',
  component: RegistrySettings,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RegistrySettings>;

export default meta;

type Story = StoryObj<typeof meta>;

const onRejoin = fn();

export const Default: Story = {
  args: {
    settings: { devPluginUrl: 'http://localhost:3967', devPluginEnabled: false },
    onSettingsChange: () => {},
    activeDevPluginIds: [],
    onEnableDev: async () => {},
    onDisableDev: async () => {},
    pluginScopeLocal: false,
    onPluginScopeLocalChange: () => {},
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

/** Rejoining the account replaces this device's plugin choices, so it prompts first. */
export const RejoinPrompt: Story = {
  args: {
    settings: { devPluginUrl: 'http://localhost:3967', devPluginEnabled: false },
    onSettingsChange: () => {},
    activeDevPluginIds: [],
    onEnableDev: async () => {},
    onDisableDev: async () => {},
    pluginScopeLocal: true,
    onPluginScopeLocalChange: onRejoin,
  },
  play: async () => {
    onRejoin.mockClear();
    const body = within(document.body);

    const scopeSwitch = await body.findByTestId('registrySettings.pluginScope', undefined, { timeout: 10_000 });
    await expect(scopeSwitch).toBeChecked();

    await userEvent.click(scopeSwitch);
    const confirm = await body.findByTestId('registrySettings.pluginScope.confirm', undefined, { timeout: 10_000 });
    await expect(onRejoin).not.toHaveBeenCalled();

    await userEvent.click(confirm);
    await expect(onRejoin).toHaveBeenCalledWith(false);
  },
};
