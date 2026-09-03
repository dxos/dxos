//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useActions as useGraphActions } from '@dxos/plugin-graph/hooks';
import { applyPresentation } from '@dxos/react-ui-menu';

import { NavTreeNode } from '#types';

/** Dispositions rendered as navtree item (row/header) actions, most-primary first. */
const LIST_ITEM_DISPOSITIONS = ['list-item-primary', 'list-item'];

/**
 * Flattens grouped actions and filters to the list-item dispositions rendered as
 * navtree item actions. Shared by row (`NavTreeItemColumns`) and header (`L1Panel`)
 * so both apply the same normalization rule. Applies each action's `presentation['list-item'
 * | 'list-item-primary']` chrome override, if any, so an action multi-targeting the toolbar
 * and the nav-tree can render appropriately in each.
 */
export const getListActions = ({ actions, groupedActions }: NavTreeNode.FlattenedActions): AppGraphNode.Action[] =>
  actions
    .flatMap((action) => (AppGraphNode.isAction(action) ? [action] : (groupedActions[action.id] ?? [])))
    .filter((action) => AppGraphNode.hasDisposition(action, LIST_ITEM_DISPOSITIONS))
    .map((action) => {
      const surface = LIST_ITEM_DISPOSITIONS.find((disposition) => AppGraphNode.hasDisposition(action, disposition));
      return surface ? applyPresentation(action, surface) : action;
    });

/** Returns flattened actions and grouped sub-actions for a given graph node. */
export const useActions = (node: AppGraphNode.Node): NavTreeNode.FlattenedActions => {
  const { graph } = useAppGraph();
  const actions = useGraphActions(graph, node.id);

  return useMemo(() => {
    return actions.reduce(
      (acc: NavTreeNode.FlattenedActions, arg) => {
        if (AppGraphNode.hasDisposition(arg, 'item')) {
          return acc;
        }

        acc.actions.push(arg);
        if (!AppGraphNode.isAction(arg)) {
          const actionGroup = AppGraph.getActions(graph, arg.id);
          acc.groupedActions[arg.id] = actionGroup;
        }
        return acc;
      },
      { actions: [], groupedActions: {} },
    );
  }, [actions]);
};
