//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import {} from '@dxos/app-framework';
import { useApp } from '@dxos/app-framework/ui';
import { withTheme } from '@dxos/react-ui/testing';

import { DebugPlugin } from './debug/index.ts';
import { GeneratorPlugin, createNumberPlugin } from './generator/index.ts';
import { LayoutPlugin } from './layout/index.ts';
import { LoggerPlugin } from './logger/index.ts';

const plugins = [
  // prettier-ignore
  LayoutPlugin(),
  DebugPlugin(),
  LoggerPlugin(),
  GeneratorPlugin(),
];
const defaults = plugins.map((plugin) => plugin.meta.profile.key);

const DefaultStory = () => {
  const App = useApp({
    pluginLoader: (id: string) => Effect.sync(() => ({ plugin: createNumberPlugin(id) })),
    plugins,
    defaults,
  });

  return <App />;
};

const meta = {
  title: 'sdk/composer-toolkit/playground',
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
