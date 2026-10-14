//
// Copyright 2025 DXOS.org
//

import { type FC, createContext, useContext } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { raise } from '@dxos/debug';
import type { TreeModel, TreeRootProps } from '@dxos/react-ui-list';

import { NavTreeNode } from '#types';

import type { L1PanelProps } from '../Sidebar/index.ts';

export type NavTreeContextValue = {
  model: TreeModel<NavTreeNode.NavTreeItemGraphNode>;
  popoverAnchorId?: string;
  renderItemEnd?: FC<{ node: AppGraphNode.Node; open: boolean }>;
  onTabChange?: (node: NavTreeNode.NavTreeItemGraphNode) => void;
} & Pick<
  TreeRootProps<NavTreeNode.NavTreeItemGraphNode>,
  'canDrop' | 'canSelect' | 'getDropKind' | 'onOpenChange' | 'onSelect' | 'onItemHover'
> &
  Pick<L1PanelProps, 'onBack'>;

export const NavTreeContext = createContext<NavTreeContextValue | null>(null);

export const useNavTreeContext = () => useContext(NavTreeContext) ?? raise(new Error('Missing NavTreeContext'));
