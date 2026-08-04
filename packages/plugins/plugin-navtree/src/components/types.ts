//
// Copyright 2025 DXOS.org
//

import type { FC } from 'react';

import { type Node } from '@dxos/app-graph';
import type { Density } from '@dxos/react-ui';
import type { TreeModel, TreeProps } from '@dxos/react-ui-list';

import * as NavTreeNode from '../types/NavTreeNode';
import type { L1PanelProps } from './Sidebar';

export type NavTreeContextValue = {
  model: TreeModel<NavTreeNode.NavTreeItemGraphNode>;
  popoverAnchorId?: string;
  renderItemEnd?: FC<{ node: Node.Node; open: boolean }>;
  onTabChange?: (node: NavTreeNode.NavTreeItemGraphNode) => void;
} & Pick<
  TreeProps<NavTreeNode.NavTreeItemGraphNode>,
  'blockInstruction' | 'canDrop' | 'canSelect' | 'onOpenChange' | 'onSelect' | 'onItemHover'
> &
  Pick<L1PanelProps, 'onBack'>;

export type NavTreeItemColumnsProps = {
  path: string[];
  item: Node.Node;
  open: boolean;
  density?: Density;
};
