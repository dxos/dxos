//
// Copyright 2025 DXOS.org
//

import type { FC } from 'react';

import type { Node } from '@dxos/app-graph';
import type { TreeProps } from '@dxos/react-ui-list';
import type { MaybePromise } from '@dxos/util';

import type { FlattenedActions, NavTreeItemGraphNode } from '../types';

export type NavTreeColumnsProps = {
  path: string[];
  item: Node;
  open: boolean;
};

export type NavTreeProps = Omit<
  TreeProps<NavTreeItemGraphNode>,
  'draggable' | 'gridTemplateColumns' | 'renderColumns' | 'getItems' | 'getProps' | 'isCurrent' | 'canDrop' | 'onSelect'
>;

export type NavTreeContextValue = Pick<
  TreeProps<NavTreeItemGraphNode>,
  'getItems' | 'getProps' | 'isCurrent' | 'canDrop' | 'onSelect'
> & {
  getActions: (node: Node) => FlattenedActions;
  loadDescendents?: (node: Node) => MaybePromise<void>;
  renderItemEnd?: FC<{ node: Node; open: boolean }>;
  popoverAnchorId?: string;
};
