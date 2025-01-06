//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { DebugPlugin } from './debug';
import { createNumberPlugin, GeneratorPlugin } from './generator';
import { LayoutPlugin } from './layout';
import { LoggerPlugin } from './logger';
import { IntentPlugin } from '../Intent';
import { createApp } from '../app';

const plugins = [IntentPlugin, LayoutPlugin, DebugPlugin, LoggerPlugin, GeneratorPlugin];

const Story = createApp({
  pluginLoader: (id) => createNumberPlugin(id),
  plugins,
  core: plugins.map((plugin) => plugin.meta.id),
  // Having a non-empty placeholder makes it clear if it's taking a while to load.
  placeholder: <div>Loading...</div>,
});

export const Playground = {};

export default {
  title: 'sdk/app-framework/playground',
  render: Story,
  decorators: [withTheme, withLayout({ tooltips: true })],
};
