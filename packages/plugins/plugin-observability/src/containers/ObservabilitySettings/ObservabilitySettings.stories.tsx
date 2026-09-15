//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Settings } from '#types';

import { ObservabilitySettings } from './ObservabilitySettings.tsx';

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

  return <ObservabilitySettings subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-observability/containers/ObservabilitySettings',
  component: DefaultStory,
  tags: ['settings'],
  // The container routes edits through an operation, so it needs the invoker capability.
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager({ plugins: corePlugins() })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      enabled: true,
    },
  },
};
