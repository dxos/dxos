//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { Surface, createApp } from '@dxos/app-framework';

import { DebugPlugin } from '../DebugPlugin';

// TODO(burdon): Probably a bug.
const DefaultDebugPluginStory = () => {
  return <Surface role='main' data={{}} />;
};

const DebugPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/debug-story',
  },
  provides: {
    root: DefaultDebugPluginStory,
  },
});

const DebugSurfacesApp = createApp({ plugins: [ThemePlugin(), DebugPlugin(), DebugPluginStoryPlugin()] });

export default {
  component: DebugSurfacesApp,
};

export const Default = {
  args: {},
};
