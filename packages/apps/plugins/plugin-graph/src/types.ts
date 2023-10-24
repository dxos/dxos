//
// Copyright 2023 DXOS.org
//

import type { Graph, NodeBuilder } from '@dxos/app-graph';
import { type Plugin } from '@dxos/react-surface';

export type GraphContextValue = {
  graph: Graph;
};

export type WithPlugins = (plugin: Plugin[]) => NodeBuilder;

export type GraphProvides = {
  graph: {
    // TODO(wittjosiah): Unify.
    //  ({ parent: Node, plugins: plugin[] }) => UnsubscribeCallback | void
    nodes?: NodeBuilder;
    withPlugins?: WithPlugins;
  };
};

export type GraphPluginProvides = {
  graph: () => Graph;
};
