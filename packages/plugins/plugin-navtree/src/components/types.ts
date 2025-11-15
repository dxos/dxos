//
// Copyright 2025 DXOS.org
//

import type { FC } from 'react';

import type { Node } from '@dxos/app-graph';
import type { Density } from '@dxos/react-ui';
import type { TreeProps } from '@dxos/react-ui-list';
import type { MaybePromise } from '@dxos/util';

import type { FlattenedActions, NavTreeItemGraphNode } from '../types';

import type { L1PanelProps } from './Sidebar';

export type NavTreeContextValue = Pick<
  TreeProps<NavTreeItemGraphNode, { disposition?: string; sort?: boolean }>,
  'useItems' | 'getProps' | 'isCurrent' | 'isOpen' | 'blockInstruction' | 'canDrop' | 'onOpenChange' | 'onSelect'
> &
  Pick<L1PanelProps, 'onBack'> & {
    tab: string;
    topbar?: boolean;
    popoverAnchorId?: string;
    renderItemEnd?: FC<{ node: Node; open: boolean }>;
    useActions: (node: Node) => FlattenedActions;
    loadDescendents?: (node: Node) => MaybePromise<void>;
    isAlternateTree?: (path: string[], item: NavTreeItemGraphNode) => boolean;
    setAlternateTree?: (path: string[], open: boolean) => void;
    onTabChange?: (node: NavTreeItemGraphNode) => void;
  };

export type NavTreeItemColumnsProps = {
  path: string[];
  item: Node;
  open: boolean;
  density?: Density;
};
