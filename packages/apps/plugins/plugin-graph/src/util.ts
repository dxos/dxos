//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/react-surface';

import { GraphNode, GraphNodeAction, GraphProvides } from './types';

export const ROOT: GraphNode = {
  id: 'root',
  index: 'a1',
  label: 'Root',
  description: 'Root node',
};

export const isGraphNode = (datum: unknown): datum is GraphNode =>
  datum && typeof datum === 'object' ? 'id' in datum && 'label' in datum : false;

type GraphPlugin = Plugin<GraphProvides>;
export const graphPlugins = (plugins: Plugin[]): GraphPlugin[] =>
  (plugins as GraphPlugin[]).filter(
    (p) => typeof p.provides?.graph?.nodes === 'function' || typeof p.provides?.graph?.actions === 'function',
  );

export const getActions = (node: GraphNode): GraphNodeAction[] =>
  Object.values(node.pluginActions ?? {})
    .flat()
    .sort((a, b) => {
      if (a.disposition === b.disposition) {
        return 0;
      }

      if (a.disposition === 'toolbar') {
        return -1;
      }

      return 1;
    });

export type BuildGraphOptions = {
  from: GraphNode;
  onUpdate?: (path: string[], nodes: GraphNode | GraphNode[]) => void;
  plugins?: Plugin[];
  path?: string[];
  ignore?: string[];
};

export const buildGraph = ({ from, onUpdate, plugins = [], path = [], ignore = [] }: BuildGraphOptions): GraphNode => {
  const validPlugins = graphPlugins(plugins).filter((plugin) => !ignore.includes(plugin.meta.id));

  from.pluginChildren = validPlugins.reduce((acc, plugin) => {
    const invalidate = (newFrom?: GraphNode) => {
      if (!onUpdate) {
        return;
      }

      if (newFrom) {
        const index = nodes.findIndex((n) => n.id === newFrom.id);
        const stringIndex = index >= 0 ? String(index) : String(nodes.length);
        buildGraph({
          from: newFrom,
          plugins,
          onUpdate,
          path: [...path, 'pluginChildren', plugin.meta.id, stringIndex],
          ignore: [...ignore, plugin.meta.id],
        });
        onUpdate([...path, 'pluginChildren', plugin.meta.id, stringIndex], newFrom);
        return;
      }

      const newNodes = plugin.provides.graph.nodes?.(from, invalidate, plugins) ?? [];
      newNodes.forEach((node, index) =>
        buildGraph({
          from: node,
          plugins,
          onUpdate,
          path: [...path, 'pluginChildren', plugin.meta.id, String(index)],
          ignore: [...ignore, plugin.meta.id],
        }),
      );
      onUpdate([...path, 'pluginChildren', plugin.meta.id], newNodes);
    };
    const nodes = plugin.provides.graph.nodes?.(from, invalidate, plugins) ?? [];
    acc[plugin.meta.id] = nodes;
    return acc;
  }, (from.pluginChildren ?? {}) as Record<string, GraphNode[]>);

  from.pluginActions = validPlugins.reduce((acc, plugin) => {
    // TODO(wittjosiah): Actions invalidate.
    const actions = plugin.provides.graph.actions?.(from, () => {}) ?? [];
    acc[plugin.meta.id] = actions;
    return acc;
  }, (from.pluginActions ?? {}) as Record<string, GraphNodeAction[]>);

  for (const [id, nodes] of Object.entries(from.pluginChildren)) {
    for (const index in nodes) {
      const node = nodes[index];
      buildGraph({
        from: node,
        plugins,
        onUpdate,
        path: [...path, 'pluginChildren', id, index],
        ignore: [...ignore, id],
      });
    }
  }

  return from;
};
