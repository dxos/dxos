//
// Copyright 2023 DXOS.org
//

import { type Action, type Node, type NodeFilter } from '@dxos/app-graph';
import { type NavTreeItemNode } from '@dxos/react-ui-navtree';
import { type NavTreeItemNodeProperties } from '@dxos/react-ui-navtree/src';

type NavTreeItemGraphNode = NavTreeItemNode<Node<NavTreeItemNodeProperties>>;

// TODO(wittjosiah): Move into node implementation?
export const sortActions = (actions: Action[]): Action[] =>
  actions.sort((a, b) => {
    if (a.properties.disposition === b.properties.disposition) {
      return 0;
    }

    if (a.properties.disposition === 'toolbar') {
      return -1;
    }

    return 1;
  });

/*
TODO(thure): reimplement as a root-level callback
 */

// export const getPersistenceParent = (treeItem: NavTreeItemGraphNode, persistenceClass: string): Node | null => {
//   const parentId = treeItem.path ? treeItem.path[treeItem.path.length - 1] : 'never';
//   const parent = treeItem.node.nodes({ direction: 'inbound' }).find((n) => n.id === parentId);
//
//   if (!parent) {
//     return null;
//   }
//
//   if (parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
//     return parent;
//   } else {
//     return getPersistenceParent(parent, persistenceClass);
//   }
// };

export type TreeNodeFromGraphNodeOptions = {
  filter?: NodeFilter;
  path?: string[];
};

export const getNavTreeNode = (navTreeItems: NavTreeItemNode[], queryPath?: string[]): NavTreeItemNode | null => {
  if (!queryPath) {
    return null;
  }

  return navTreeItems.find(({ path }) => (path ? !path.find((id, index) => queryPath[index] !== id) : false)) ?? null;
};

/**
 * Get a reactive tree node from a graph node.
 */
// export const treeNodeFromGraphNode = (node: Node, options: TreeNodeFromGraphNodeOptions = {}): TreeNode => {
//   const { filter, path = [] } = options;
//
//   const treeNode = create<TreeNode>({
//     id: node.id,
//     data: node.data,
//     get label() {
//       return node.properties.label;
//     },
//     get icon() {
//       return node.properties.icon;
//     },
//     get properties() {
//       // This must be done inside the getter so that properties are only reactive if they are accessed.
//       // eslint-disable-next-line unused-imports/no-unused-vars
//       const { label, icon, ...properties } = node.properties;
//       return properties;
//     },
//     get parent() {
//       const parentId = path[path.length - 1];
//       const parent = node.nodes({ direction: 'inbound' }).find((n) => n.id === parentId);
//       return parent ? treeNodeFromGraphNode(parent, { ...options, path: path.slice(0, -1) }) : null;
//     },
//     get children() {
//       return node
//         .nodes({ filter })
//         .map((n) => {
//           // Break cycles.
//           const nextPath = [...path, node.id];
//           return nextPath.includes(n.id) ? undefined : treeNodeFromGraphNode(n, { ...options, path: nextPath });
//         })
//         .filter(nonNullable);
//     },
//     get actions() {
//       return node
//         .actions()
//         .map((action) =>
//           isAction(action) ? treeActionFromGraphAction(action) : treeActionGroupFromGraphActionGroup(action),
//         );
//     },
//   });
//
//   return treeNode;
// };

/**
 * Get a reactive tree action from a graph action.
 */
// export const treeActionFromGraphAction = (action: Action): TreeNodeAction => {
//   const { icon, label, keyBinding, ...properties } = action.properties;
//   const node = action.nodes({ direction: 'inbound' })[0];
//   const treeAction = create<TreeNodeAction>({
//     id: action.id,
//     label,
//     icon,
//     keyBinding,
//     properties,
//     invoke: (params) => action.data({ node, ...params }),
//   });
//
//   return treeAction;
// };

/**
 * Get a reactive tree action group from a graph action group.
 */
// export const treeActionGroupFromGraphActionGroup = (actionGroup: ActionGroup): TreeNodeActionGroup => {
//   const { icon, label, ...properties } = actionGroup.properties;
//   const treeActionGroup = create<TreeNodeActionGroup>({
//     id: actionGroup.id,
//     label,
//     icon,
//     properties,
//     get actions() {
//       // TODO(wittjosiah): Support nested action groups.
//       return actionGroup.actions().flatMap((action) => (isAction(action) ? treeActionFromGraphAction(action) : []));
//     },
//   });
//
//   return treeActionGroup;
// };
