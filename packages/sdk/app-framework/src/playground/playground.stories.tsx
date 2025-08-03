//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useApp } from '../App';
import { IntentPlugin } from '../plugin-intent';

import { DebugPlugin } from './debug';
import { GeneratorPlugin, createNumberPlugin } from './generator';
import { LayoutPlugin } from './layout';
import { LoggerPlugin } from './logger';

const plugins = [IntentPlugin(), LayoutPlugin(), DebugPlugin(), LoggerPlugin(), GeneratorPlugin()];

const Placeholder = () => {
  return <div>Loading...</div>;
};

const Story = () => {
  const App = useApp({
    pluginLoader: (id) => createNumberPlugin(id),
    plugins,
    core: plugins.map((plugin) => plugin.meta.id),
    // Having a non-empty placeholder makes it clear if it's taking a while to load.
    placeholder: Placeholder,
  });

  return <App />;
};

export const Playground = {};

export default {
  title: 'sdk/app-framework/playground',
  render: Story,
  decorators: [withTheme, withLayout()],
};
