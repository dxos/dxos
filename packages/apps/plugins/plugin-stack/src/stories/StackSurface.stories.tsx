//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Stack as StackProto } from '@braneframe/types';
import { PluginContextProvider, Surface, ThemePlugin } from '@dxos/react-surface';

import { StackPlugin } from '../plugin';

const StackPluginStoryPlugin = {
  meta: {
    id: 'dxos:StackPluginStoryPlugin',
  },
  provides: {
    components: {
      default: () => {
        const stack = new StackProto();
        return <Surface role='main' data={stack} />;
      },
    },
  },
};

const StackSurfacesApp = () => {
  return <PluginContextProvider plugins={[ThemePlugin, StackPlugin, StackPluginStoryPlugin]} />;
};

export default {
  component: StackSurfacesApp,
};

export const Default = {
  args: {},
};
