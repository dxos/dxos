//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/aurora';

import { Surface } from '../../framework';
import { GraphNode } from '../GraphPlugin';

export type TreeViewProps = {
  items?: GraphNode[];
};

export const TreeView = (props: TreeViewProps) => {
  const { items } = props;
  return (
    <Tree.Branch>
      {items?.length ? items.map((item) => <Surface key={item.id} role='treeitem' data={item} />) : 'no items'}
    </Tree.Branch>
  );
};
