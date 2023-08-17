//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/react-surface';

import type { Graph, SessionGraph } from './graph';

export type GraphContextValue = {
  graph: SessionGraph;
};

export type GraphProvides = {
  graph: {
    nodes: (plugins: Plugin[]) => Graph.NodeBuilder;
  };
};

export type GraphPluginProvides = {
  graph: SessionGraph;
};
