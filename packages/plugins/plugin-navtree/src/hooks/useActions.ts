//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActions as useGraphActions } from '@dxos/plugin-graph';

import { type FlattenedActions } from '../types';

/**
 * Returns flattened actions and grouped sub-actions for a given graph node.
 * When `path` is provided, actions with a `parentMatch` predicate are filtered
 * based on the parent node in the current tree path.
 */
// TODO(wittjosiah): Filtering node-level actions by parent context is a workaround.
//   This would be cleaner with edge-associated actions on the graph.
export const useActions = (node: Node.Node, path?: string[]): FlattenedActions => {
  const { graph } = useAppGraph();
  const actions = useGraphActions(graph, node.id);

  return useMemo(() => {
    const parentId = path && path.length >= 2 ? path[path.length - 2] : undefined;
    const parentNode = parentId ? Option.getOrUndefined(Graph.getNode(graph, parentId)) : undefined;

    return actions.reduce(
      (acc: FlattenedActions, arg) => {
        if (arg.properties.disposition === 'item') {
          return acc;
        }

        if (arg.properties.parentMatch && (!parentNode || !arg.properties.parentMatch(parentNode))) {
          return acc;
        }

        acc.actions.push(arg);
        if (!Node.isAction(arg)) {
          const actionGroup = Graph.getActions(graph, arg.id);
          acc.groupedActions[arg.id] = actionGroup;
        }
        return acc;
      },
      { actions: [], groupedActions: {} },
    );
  }, [actions, path]);
};
