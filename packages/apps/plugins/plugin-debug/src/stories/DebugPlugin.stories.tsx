//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { Debug as DebugType } from '@braneframe/types';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { DebugPlugin } from '../DebugPlugin';

const DefaultDebugPluginStory = () => {
  const object = new DebugType({});
  return <Surface role='main' data={[object, object]} />;
};

const DebugPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/debug-story',
  },
  provides: {
    components: {
      default: DefaultDebugPluginStory,
    },
  },
});

const DebugSurfacesApp = () => (
  <PluginContextProvider plugins={[ThemePlugin(), DebugPlugin(), DebugPluginStoryPlugin()]} />
);

export default {
  component: DebugSurfacesApp,
};

export const Default = {
  args: {},
};
