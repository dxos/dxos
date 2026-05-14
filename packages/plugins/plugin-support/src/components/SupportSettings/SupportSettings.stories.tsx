//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type Settings } from '#types';

import { SupportSettings } from './SupportSettings';

const DefaultStory = () => {
  const [settings, setSettings] = useState<Settings.Settings>({ showWelcome: true });
  return <SupportSettings settings={settings} onSettingsChange={(cb) => setSettings((s) => cb(s))} />;
};

const meta = {
  title: 'plugins/plugin-support/components/SupportSettings',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
