//
// Copyright 2025 DXOS.org
//

import type { FC } from 'react';

import type { Node } from '@dxos/app-graph';
import type { TreeProps } from '@dxos/react-ui-list';
import type { MaybePromise } from '@dxos/util';

import type { FlattenedActions, NavTreeItemGraphNode } from '../types';

export type NavTreeItemColumnsProps = {
  path: string[];
  item: Node;
  open: boolean;
};

export type NavTreeProps = Pick<TreeProps<NavTreeItemGraphNode>, 'id' | 'root'>;

export type NavTreeContextValue = Pick<
  TreeProps<NavTreeItemGraphNode>,
  'getProps' | 'isCurrent' | 'isOpen' | 'onOpenChange' | 'canDrop' | 'onSelect'
> & {
  tab: string;
  onTabChange?: (node: NavTreeItemGraphNode) => void;
  getItems: (node?: NavTreeItemGraphNode, disposition?: string) => NavTreeItemGraphNode[];
  getActions: (node: Node) => FlattenedActions;
  loadDescendents?: (node: Node) => MaybePromise<void>;
  renderItemEnd?: FC<{ node: Node; open: boolean }>;
  popoverAnchorId?: string;
  topbar?: boolean;
};
