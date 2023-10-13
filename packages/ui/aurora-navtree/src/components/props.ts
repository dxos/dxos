//
// Copyright 2023 DXOS.org
//

import { type Node, type Action } from 'packages/apps/plugins/plugin-graph';

export type TreeNodeAction = Pick<Action, 'id' | 'label' | 'invoke' | 'actions' | 'properties' | 'icon' | 'keyBinding'>;

export type TreeNode = Pick<Node, 'id' | 'label' | 'properties' | 'icon'> & {
  children: TreeNode[];
  actions: TreeNodeAction[];
};

export type NavTreeItemData = { id: TreeNode['id']; node: TreeNode; level: number };
