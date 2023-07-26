//
// Copyright 2023 DXOS.org
//

import { DeepSignal, deepSignal } from 'deepsignal/react';
import set from 'lodash.set';
import React from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { PluginDefinition } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { GraphNode, GraphNodeAction, GraphPluginProvides } from './types';
import { ROOT, buildGraph } from './util';

export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const graph: DeepSignal<GraphNode> = deepSignal({
    id: 'root',
    index: 'a1',
    label: 'Root',
    description: 'Root node',
    pluginChildren: {},
    pluginActions: {},
    // get children(): GraphNode[] {
    //   return [];
    // },
    // get actions(): GraphNodeAction[] {
    //   return [];
    // },
  });

  return {
    meta: {
      id: 'dxos.org/plugin/graph',
    },
    ready: async (plugins) => {
      const result = buildGraph({ from: ROOT, plugins, onUpdate: (path, nodes) => set(graph, path, nodes) });
      graph.pluginChildren = deepSignal(result.pluginChildren ?? {});
      graph.pluginActions = deepSignal(result.pluginActions ?? {});
    },
    provides: {
      context: ({ children }) => {
        const { sendIntent } = useIntent();
        const invokeAction = async (action: GraphNodeAction) => {
          if (Array.isArray(action.intent)) {
            let result: any = null;
            for (const intent of action.intent) {
              const data = intent.data ? { ...result, ...intent.data } : result;
              result = await sendIntent({ ...intent, data });
            }
            return result;
          } else {
            await sendIntent(action.intent);
          }
        };

        return <GraphContext.Provider value={{ graph, invokeAction }}>{children}</GraphContext.Provider>;
      },
      graph,
    },
  };
};
