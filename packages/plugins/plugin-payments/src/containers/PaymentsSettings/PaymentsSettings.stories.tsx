//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type Settings } from '#types';

import { PaymentsSettings } from './PaymentsSettings';

type StoryProps = {
  settings: Settings.Settings;
};

// The container reads and writes the plugin's settings atom, so the story owns one per render.
const DefaultStory = ({ settings }: StoryProps) => {
  const atom = useMemo(() => Atom.make<Settings.Settings>(settings).pipe(Atom.keepAlive), [settings]);

  return <PaymentsSettings atom={atom} />;
};

const meta = {
  title: 'plugins/plugin-payments/containers/PaymentsSettings',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  tags: ['settings'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

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
