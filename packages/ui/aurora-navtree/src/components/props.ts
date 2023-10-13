//
// Copyright 2023 DXOS.org
//

import { type Node, type Action } from 'packages/apps/plugins/plugin-graph/src';

import { type MosaicContainerProps } from '@dxos/aurora-grid/next';

export type TreeNodeAction = Pick<Action, 'id' | 'label' | 'invoke'>;

export type TreeNode = Pick<Node, 'id' | 'label'> & { children: TreeNode[]; actions: TreeNodeAction[] };

export type NavTreeProps = { node: TreeNode } & Omit<MosaicContainerProps<TreeNode, number>, 'debug' | 'Component'>;

export type NavTreeItemProps = { node: TreeNode; level: number };

export type NavTreeItemHeadingProps = {
  open?: boolean;
  active?: boolean;
  level: number;
  node: TreeNode;
};
