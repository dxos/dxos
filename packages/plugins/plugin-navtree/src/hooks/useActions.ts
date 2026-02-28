//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActions as useGraphActions } from '@dxos/plugin-graph';

import { type FlattenedActions } from '../types';

/**
 * Returns flattened actions and grouped sub-actions for a given graph node.
 */
export const useActions = (node: Node.Node): FlattenedActions => {
  const { graph } = useAppGraph();
  const actions = useGraphActions(graph, node.id);

  return useMemo(
    () =>
      actions.reduce(
        (acc: FlattenedActions, arg) => {
          if (arg.properties.disposition === 'item') {
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
      ),
    [actions],
  );
};
