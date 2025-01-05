//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { DebugPlugin } from './debug';
import { LayoutPlugin } from './layout';
import { LoggerPlugin } from './logger';
import { IntentPlugin } from '../Intent';
import { createApp } from '../app';

const Story = createApp({
  plugins: [IntentPlugin, LayoutPlugin, DebugPlugin, LoggerPlugin],
  core: [IntentPlugin.meta.id],
  defaults: [LayoutPlugin.meta.id, DebugPlugin.meta.id, LoggerPlugin.meta.id],
  // Having a non-empty placeholder makes it clear if it's taking a while to load.
  placeholder: <div>Loading...</div>,
});

export const Playground = {};

export default {
  title: 'sdk/app-framework/playground',
  render: Story,
  decorators: [withTheme],
};
