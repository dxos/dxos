//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { RegistrySettings } from './RegistrySettings';

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
    // Present, so the plugin-set scope section renders; `Enabled` omits it and covers the
    // no-device-sync case.
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

/**
 * Rejoining the account replaces this device's plugin choices, so it is the one direction that must
 * ask first. Leaving is lossless and deliberately does not prompt.
 */
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

    // Flipping it off is the rejoin direction, so it must prompt rather than act.
    await userEvent.click(scopeSwitch);
    const confirm = await body.findByTestId('registrySettings.pluginScope.confirm', undefined, { timeout: 10_000 });
    await expect(onRejoin).not.toHaveBeenCalled();

    await userEvent.click(confirm);
    await expect(onRejoin).toHaveBeenCalledWith(false);
  },
};
