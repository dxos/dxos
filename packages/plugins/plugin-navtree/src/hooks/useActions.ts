//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActions as useGraphActions } from '@dxos/plugin-graph';

import { type FlattenedActions } from '#types';

/**
 * Flattens grouped actions and filters to the list-item dispositions rendered as
 * navtree item actions. Shared by row (`NavTreeItemColumns`) and header (`L1Panel`)
 * so both apply the same normalization rule.
 */
export const getListActions = ({ actions, groupedActions }: FlattenedActions): Node.Action[] =>
  actions
    .flatMap((action) => (Node.isAction(action) ? [action] : (groupedActions[action.id] ?? [])))
    .filter((action) => ['list-item', 'list-item-primary'].includes(action.properties?.disposition));

/** Returns flattened actions and grouped sub-actions for a given graph node. */
export const useActions = (node: Node.Node): FlattenedActions => {
  const { graph } = useAppGraph();
  const actions = useGraphActions(graph, node.id);

  return useMemo(() => {
    return actions.reduce(
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
    );
  }, [actions]);
};
