//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { OperationPlugin } from '../plugin-operation';
import { useApp } from '../react';

import { DebugPlugin } from './debug';
import { GeneratorPlugin, createNumberPlugin } from './generator';
import { LayoutPlugin } from './layout';
import { LoggerPlugin } from './logger';

const plugins = [
  // prettier-ignore
  OperationPlugin(),
  LayoutPlugin(),
  DebugPlugin(),
  LoggerPlugin(),
  GeneratorPlugin(),
];
const core = plugins.map((plugin) => plugin.meta.id);

const Placeholder = () => {
  return <div>Loading...</div>;
};

const DefaultStory = () => {
  const App = useApp({
    pluginLoader: (id: string) => Effect.sync(() => createNumberPlugin(id)),
    plugins,
    core,
    placeholder: Placeholder,
  });

  return <App />;
};

const meta = {
  title: 'sdk/app-framework/playground',
  render: DefaultStory,
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
