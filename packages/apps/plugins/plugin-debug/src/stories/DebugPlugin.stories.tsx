//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { PluginProvider, Surface } from '@dxos/react-surface';

import { DebugPlugin } from '../DebugPlugin';

// TODO(burdon): Probably a bug.
const DefaultDebugPluginStory = () => {
  return <Surface role='main' data={[]} />;
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

const DebugSurfacesApp = () => <PluginProvider plugins={[ThemePlugin(), DebugPlugin(), DebugPluginStoryPlugin()]} />;

export default {
  component: DebugSurfacesApp,
};

export const Default = {
  args: {},
};
