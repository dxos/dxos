//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginContextProvider } from '../framework';
import { ThemePlugin, ClientPlugin, SplitViewPlugin, ListViewPlugin, RoutesPlugin } from '../plugins';

export const TestApp = () => {
  return <PluginContextProvider plugins={[ThemePlugin, ClientPlugin, SplitViewPlugin, ListViewPlugin, RoutesPlugin]} />;
};
