//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Settings } from '#types';

import { DeckSettings } from './DeckSettings';

type StoryArgs = {
  settings: Settings.Settings;
};

// The container reads and writes the contributed settings entry, so the story owns one per render.
const DefaultStory = ({ settings }: StoryArgs) => {
  const subject = useMemo(
    () => ({
      prefix: pluginMeta.profile.key,
      schema: Settings.Settings,
      atom: Atom.make<Settings.Settings>(settings).pipe(Atom.keepAlive),
    }),
    [settings],
  );

  return <DeckSettings subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-deck/containers/DeckSettings',
  tags: ['settings'],
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      showHints: true,
      enableNativeRedirect: false,
    },
  },
};
