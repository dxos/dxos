//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginContextProvider } from '../framework';
import { GraphPlugin, RoutesPlugin, SplitViewPlugin, ThemePlugin, TreeViewPlugin } from '../plugins';

export const TestApp = () => {
  return <PluginContextProvider plugins={[RoutesPlugin, ThemePlugin, GraphPlugin, TreeViewPlugin, SplitViewPlugin]} />;
};
