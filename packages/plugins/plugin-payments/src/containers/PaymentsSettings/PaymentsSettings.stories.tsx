//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type Settings } from '#types';

import { PaymentsSettings, type PaymentsSettingsProps } from './PaymentsSettings';

const DefaultStory = ({ settings: initialSettings, ...props }: PaymentsSettingsProps) => {
  const [settings, setSettings] = useState<Settings.Settings>(initialSettings ?? {});
  return (
    <PaymentsSettings
      settings={settings}
      onSettingsChange={(update) => setSettings((current) => update(current))}
      {...props}
    />
  );
};

const meta = {
  title: 'plugins/plugin-payments/containers/PaymentsSettings',
  component: PaymentsSettings,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  tags: ['settings'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof PaymentsSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No payments URL configured yet — the purchase buttons are disabled. */
export const Default: Story = {
  args: {
    settings: {},
  },
};

/** A payments URL is set, enabling the x402 and Stripe purchase actions. */
export const Configured: Story = {
  args: {
    settings: {
      paymentsUrl: 'http://localhost:8788',
    },
  },
};
