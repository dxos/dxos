//
// Copyright 2025 DXOS.org
//

import type { FC } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import type { Density } from '@dxos/react-ui';
import type { TreeModel, TreeProps } from '@dxos/react-ui-list';

import { NavTreeNode } from '#types';

import type { L1PanelProps } from './Sidebar';

export type NavTreeContextValue = {
  model: TreeModel<NavTreeNode.NavTreeItemGraphNode>;
  popoverAnchorId?: string;
  renderItemEnd?: FC<{ node: AppGraphNode.Node; open: boolean }>;
  onTabChange?: (node: NavTreeNode.NavTreeItemGraphNode) => void;
} & Pick<
  TreeProps<NavTreeNode.NavTreeItemGraphNode>,
  'blockInstruction' | 'canDrop' | 'canSelect' | 'onOpenChange' | 'onSelect' | 'onItemHover'
> &
  Pick<L1PanelProps, 'onBack'>;

export type NavTreeItemColumnsProps = {
  path: string[];
  item: AppGraphNode.Node;
  open: boolean;
  density?: Density;
};
