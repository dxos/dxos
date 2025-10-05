//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useApp } from '../components';
import { IntentPlugin } from '../plugin-intent';

import { DebugPlugin } from './debug';
import { GeneratorPlugin, createNumberPlugin } from './generator';
import { LayoutPlugin } from './layout';
import { LoggerPlugin } from './logger';

const pluginFactories = [IntentPlugin, LayoutPlugin, DebugPlugin(), LoggerPlugin(), GeneratorPlugin()];
const plugins = pluginFactories.map((factory) => (typeof factory === 'function' ? factory() : factory));

const Placeholder = () => {
  return <div>Loading...</div>;
};

const DefaultStory = () => {
  const App = useApp({
    pluginLoader: (id) => createNumberPlugin(id)(),
    plugins,
    core: plugins.map((plugin) => plugin.meta.id),
    placeholder: Placeholder,
  });

  return <App />;
};

const meta = {
  title: 'sdk/app-framework/playground',
  render: DefaultStory,
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
