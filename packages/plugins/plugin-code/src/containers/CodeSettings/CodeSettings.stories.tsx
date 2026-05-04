//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { translations } from '#translations';
import { type Settings } from '#types';

import { CodeSettings } from './CodeSettings';

const DefaultStory = () => {
  const [settings, setSettings] = useState<Settings.Settings>({});
  return <CodeSettings settings={settings} onSettingsChange={setSettings} />;
};

const meta = {
  title: 'plugins/plugin-code/containers/CodeSettings',
  render: () => <DefaultStory />,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [AccessToken.AccessToken] }),
    withTheme(),
    withLayout({ layout: 'column', classNames: 'w-[40rem]' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
