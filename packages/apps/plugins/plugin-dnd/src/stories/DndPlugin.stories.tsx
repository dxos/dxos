//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { PluginProvider } from '@dxos/react-surface';

import { DndPluginDefaultStoryPlugin } from './DndPluginDefaultStoryPlugin';
import { DndPluginDefaultStoryPluginA } from './DndPluginDefaultStoryPluginA';
import { DndPluginDefaultStoryPluginB } from './DndPluginDefaultStoryPluginB';
import { DndPlugin } from '../DndPlugin';

const DndSurfacesApp = () => (
  <PluginProvider
    plugins={[
      ThemePlugin(),
      DndPlugin(),
      DndPluginDefaultStoryPlugin(),
      DndPluginDefaultStoryPluginA(),
      DndPluginDefaultStoryPluginB(),
    ]}
  />
);

export default {
  component: DndSurfacesApp,
};

export const Default = {
  args: {},
};
