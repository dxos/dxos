//
// Copyright 2025 DXOS.org
//

import type { FC } from 'react';

import { type Node } from '@dxos/app-graph';
import type { Density } from '@dxos/react-ui';
import type { TreeModel, TreeProps } from '@dxos/react-ui-list';

import type { NavTreeItemGraphNode } from '../types';

import type { L1PanelProps } from './Sidebar';

export type NavTreeContextValue = {
  // Data.
  model: TreeModel<NavTreeItemGraphNode>;
  popoverAnchorId?: string;
  renderItemEnd?: FC<{ node: Node.Node; open: boolean }>;

  // Callbacks.
  setAlternateTree?: (path: string[], open: boolean) => void;
  onTabChange?: (node: NavTreeItemGraphNode) => void;
} & Pick<TreeProps<NavTreeItemGraphNode>, 'blockInstruction' | 'canDrop' | 'canSelect' | 'onOpenChange' | 'onSelect'> &
  Pick<L1PanelProps, 'onBack'>;

export type NavTreeItemColumnsProps = {
  path: string[];
  item: Node.Node;
  open: boolean;
  density?: Density;
};
