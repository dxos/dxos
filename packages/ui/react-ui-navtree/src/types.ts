//
// Copyright 2023 DXOS.org
//

import { type Node, type Action } from '@dxos/app-graph';

export type TreeNodeAction = Pick<Action, 'id' | 'label' | 'invoke' | 'actions' | 'properties' | 'icon' | 'keyBinding'>;

export type TreeNode = Pick<Node, 'id' | 'label' | 'properties' | 'icon'> & {
  children: TreeNode[];
  actions: TreeNodeAction[];
};
