//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActions as useGraphActions } from '@dxos/plugin-graph';
import { applyPresentation } from '@dxos/react-ui-menu';

import { type FlattenedActions } from '#types';

/** Dispositions rendered as navtree item (row/header) actions, most-primary first. */
const LIST_ITEM_DISPOSITIONS = ['list-item-primary', 'list-item'];

/**
 * Flattens grouped actions and filters to the list-item dispositions rendered as
 * navtree item actions. Shared by row (`NavTreeItemColumns`) and header (`L1Panel`)
 * so both apply the same normalization rule. Applies each action's `presentation['list-item'
 * | 'list-item-primary']` chrome override, if any, so an action multi-targeting the toolbar
 * and the nav-tree can render appropriately in each.
 */
export const getListActions = ({ actions, groupedActions }: FlattenedActions): Node.Action[] =>
  actions
    .flatMap((action) => (Node.isAction(action) ? [action] : (groupedActions[action.id] ?? [])))
    .filter((action) => Node.hasDisposition(action, LIST_ITEM_DISPOSITIONS))
    .map((action) => {
      const surface = LIST_ITEM_DISPOSITIONS.find((disposition) => Node.hasDisposition(action, disposition));
      return surface ? applyPresentation(action, surface) : action;
    });

/** Returns flattened actions and grouped sub-actions for a given graph node. */
export const useActions = (node: Node.Node): FlattenedActions => {
  const { graph } = useAppGraph();
  const actions = useGraphActions(graph, node.id);

  return useMemo(() => {
    return actions.reduce(
      (acc: FlattenedActions, arg) => {
        if (Node.hasDisposition(arg, 'item')) {
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
