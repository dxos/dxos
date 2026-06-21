//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type Settings as SettingsType } from '../../types/Settings';

import { MapSettings } from './MapSettings';

const DefaultStory = ({ initial }: { initial?: SettingsType }) => {
  const [settings, setSettings] = useState<SettingsType>(initial ?? {});
  return <MapSettings settings={settings} onSettingsChange={setSettings} />;
};

const meta = {
  title: 'plugins/plugin-map/MapSettings',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithKey: Story = {
  args: {
    initial: { apiKeys: [{ name: 'maptiler.com', domain: 'maptiler.com', apiKey: 'secret-key' }] },
  },
};
