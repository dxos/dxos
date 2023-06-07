//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PluginContextProvider } from '../framework';
import { ThemePlugin, ClientPlugin, SplitViewPlugin, ListViewPlugin, RoutesPlugin } from '../plugins';
import { GithubMarkdownPlugin } from '../plugins/GithubMarkdownPlugin';
import { SpacePlugin } from '../plugins/SpacePlugin';

export const TestApp = () => {
  return (
    <PluginContextProvider
      plugins={[
        RoutesPlugin,
        ThemePlugin,
        ClientPlugin,
        ListViewPlugin,
        SplitViewPlugin,
        SpacePlugin,
        GithubMarkdownPlugin,
      ]}
    />
  );
};
