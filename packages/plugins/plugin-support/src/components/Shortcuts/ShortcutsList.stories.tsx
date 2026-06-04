//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Keyboard } from '@dxos/keyboard';
import { translations as themeTranslations } from '@dxos/plugin-theme/translations';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ShortcutsList } from './ShortcutsList';

const DefaultStory = () => {
  useEffect(() => {
    Keyboard.singleton.bind({
      shortcut: 'meta+k',
      handler: () => {},
      data: 'Commands',
    });
    Keyboard.singleton.bind({
      shortcut: "meta+'",
      handler: () => {},
      data: 'Settings',
    });
  }, []);

  return <ShortcutsList />;
};

const meta = {
  title: 'plugins/plugin-support/components/ShortcutsList',
  component: ShortcutsList,
  render: DefaultStory,
  decorators: [withTheme(), withPluginManager()],
  parameters: {
    layout: 'centered',
    translations: [...translations, ...themeTranslations],
  },
} satisfies Meta<typeof ShortcutsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
