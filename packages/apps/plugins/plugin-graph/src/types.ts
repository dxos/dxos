//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/react-surface';

import type { Graph, NodeBuilder } from './graph';

export type GraphContextValue = {
  graph: Graph;
};

export type WithPlugins = (plugin: Plugin[]) => NodeBuilder;

export type GraphProvides = {
  graph: {
    nodes?: NodeBuilder;
    withPlugins?: WithPlugins;
  };
};

export type GraphPluginProvides = {
  graph: () => Graph;
};
