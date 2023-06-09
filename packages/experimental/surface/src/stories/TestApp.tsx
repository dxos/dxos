//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginContextProvider } from '../framework';
import {
  ClientPlugin,
  GithubMarkdownPlugin,
  GraphPlugin,
  RoutesPlugin,
  SpacePlugin,
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
