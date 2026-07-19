//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapability } from '@dxos/app-toolkit';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Support } from '#types';

import { SupportCompanion } from './SupportCompanion';

// Minimal plugin that registers Support.Ticket and carries a few screenshot URLs
// in its meta so the resolver can map the ticket's typename back to a plugin
// meta with a description AND the carousel has slides to render.
const TestPluginMeta = {
  ...pluginMeta,
  screenshots: [
    { dark: 'https://picsum.photos/seed/support-1/800/450' },
    { dark: 'https://picsum.photos/seed/support-2/800/450' },
    { dark: 'https://picsum.photos/seed/support-3/800/450' },
  ],
};
const TestPlugin = Plugin.define(TestPluginMeta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Support.Ticket])),
  Plugin.make,
);

const DefaultStory = () => {
  const ticket = useMemo(() => Support.make({ title: 'Example ticket' }), []);
  return <SupportCompanion companionTo={ticket} />;
};

const meta = {
  title: 'plugins/plugin-support/containers/SupportCompanion',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withPluginManager({ plugins: [TestPlugin()] })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
