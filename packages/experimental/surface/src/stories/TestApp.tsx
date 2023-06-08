//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginContextProvider } from '../framework';
import {
  ClientPlugin,
  SpacePlugin,
  GithubMarkdownPlugin,
  GraphPlugin,
  RoutesPlugin,
  SplitViewPlugin,
  ThemePlugin,
  TreeViewPlugin,
} from '../plugins';

export const TestApp = () => {
  return (
    <PluginContextProvider
      plugins={[
        RoutesPlugin,
        ThemePlugin,
        ClientPlugin,
        GraphPlugin,
        TreeViewPlugin,
        SplitViewPlugin,
        SpacePlugin,
        GithubMarkdownPlugin,
      ]}
    />
  );
};
