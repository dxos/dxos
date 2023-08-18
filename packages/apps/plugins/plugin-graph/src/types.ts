//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/react-surface';

import type { Graph, SessionGraph } from './graph';

export type GraphContextValue = {
  graph: SessionGraph;
};

export type WithPlugins = (plugin: Plugin[]) => Graph.NodeBuilder;

export type GraphProvides = {
  graph: {
    nodes?: Graph.NodeBuilder;
    withPlugins?: WithPlugins;
  };
};

export type GraphPluginProvides = {
  graph: SessionGraph;
};
