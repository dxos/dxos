//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { type Settings } from '#types';
import { SpacetimeSettings } from './SpacetimeSettings';

const DefaultStory = () => {
  const [settings, setSettings] = useState<Settings.Settings>({ showAxes: true, showFps: false });

  return <SpacetimeSettings settings={settings} onSettingsChange={(updater) => setSettings((prev) => updater(prev))} />;
};

const meta = {
  title: 'plugins/plugin-spacetime/components/SpacetimeSettings',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
