//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Settings } from '../../types';
import { CrxSettings } from './CrxSettings';

const DefaultStory = (props: { initial?: Settings.Settings; readonly?: boolean }) => {
  const [settings, setSettings] = useState<Settings.Settings>(props.initial ?? Settings.defaults);
  return (
    <CrxSettings
      settings={settings}
      onSettingsChange={props.readonly ? undefined : (update) => setSettings((prev) => update(prev))}
    />
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-crx/CrxSettings',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Readonly: Story = {
  args: {
    readonly: true,
  },
};
