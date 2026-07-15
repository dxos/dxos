//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { type Graph, Node } from '@dxos/app-graph';

import {
  type ActionGraphEdges,
  type ActionGraphNodes,
  type ActionGraphProps,
  type MenuActions,
  useMenuActions,
} from './useMenuActions';

export type GraphMenuOptions = {
  /** Group the actions descend from. Defaults to the menu root (top-level toolbar items). */
  rootId?: string;
  /** Keep only the actions the predicate accepts (e.g. by `disposition`). */
  filter?: (action: Node.ActionLike) => boolean;
};

/**
 * Flatten a node's contributed actions (and nested {@link Node.ActionGroup}s) into the
 * `{ nodes, edges }` an {@link useMenuActions} / `Menu` consumes. The action nodes are spliced
 * verbatim, so their Effect `data` (and captured `_actionContext`) execute via `executeMenuAction`
 * without any `onAction` wiring.
 *
 * Pure over a `resolve` function so it is testable without a live graph; `resolve(id)` returns the
 * direct actions for `id` (a node id at the top level, a group id when expanding a group).
 */
export const buildGraphMenu = (
  resolve: (id: string) => Node.ActionLike[],
  nodeId: string,
  options: GraphMenuOptions = {},
): ActionGraphProps => {
  const { rootId = Node.RootId, filter } = options;
  const nodes: ActionGraphNodes = [];
  const edges: ActionGraphEdges = [];
  const seen = new Set<string>();

  const visit = (parentId: string, sourceId: string) => {
    for (const action of resolve(sourceId)) {
      if (filter && !filter(action)) {
        continue;
      }
      // Always record the parent→child edge (a shared action may sit under multiple groups).
      edges.push({ source: parentId, target: action.id, relation: 'child' });
      if (seen.has(action.id)) {
        continue;
      }
      seen.add(action.id);
      nodes.push(action as ActionGraphNodes[number]);
      // A group's children are the actions contributed for the group's own id.
      if (Node.isActionGroup(action)) {
        visit(action.id, action.id);
      }
    }
  };

  visit(rootId, nodeId);
  return { nodes, edges };
};

/**
 * Read a node's contributed actions from the app-graph as menu `ActionGraphProps`, for splicing into a
 * hand-built toolbar via `MenuBuilder.subgraph(graphActions(graph, get, nodeId))`. Reactive: reads the
 * graph's action atoms through `get`, so contributed actions appear/disappear as extensions update.
 *
 * @idiom org.dxos.react-ui-menu.graphActionsToolbar
 *   applies: Splicing a node's app-graph-contributed toolbar actions into a hand-built object toolbar
 *   instead-of: Reading `graph.actions(nodeId)` and filtering/wiring `nodes`/`edges` by hand in every toolbar
 *   uses: {@link graphActions}, {@link MenuBuilder}, {@link useMenuBuilder}
 *   related: org.dxos.react-ui-menu.toolbarMenu
 */
export const graphActions = (
  graph: Graph.ReadableGraph | undefined,
  get: Atom.Context,
  nodeId: string | undefined,
  options?: GraphMenuOptions,
): ActionGraphProps =>
  graph && nodeId ? buildGraphMenu((id) => get(graph.actions(id)), nodeId, options) : { nodes: [], edges: [] };

/**
 * Menu actions sourced entirely from a node's app-graph contributions — the common "show every action
 * the graph offers for this object" toolbar/menu. Compose with hand-built items via {@link graphActions}.
 */
export const useGraphMenuActions = (
  graph: Graph.ReadableGraph | undefined,
  nodeId: string | undefined,
  options?: GraphMenuOptions,
): MenuActions => {
  const atom = useMemo(
    () => Atom.make((get) => graphActions(graph, get, nodeId, options)),
    // `options` is expected to be stable; `rootId` participates since it reshapes the graph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, nodeId, options?.rootId],
  );
  return useMenuActions(atom);
};
