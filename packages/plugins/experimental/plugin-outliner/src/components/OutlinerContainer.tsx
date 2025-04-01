//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/live-object';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';
import { TreeNodeType, type TreeType } from '../types';

const OutlinerContainer = ({ tree, role }: { tree: TreeType; role: string }) => {
  const space = getSpace(tree);
  if (!space || !tree.root) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Outliner.Root
        classNames={mx(attentionSurface, 'p-1.5')}
        tree={tree}
        onCreate={() => {
          return space.db.add(create(TreeNodeType, { data: { text: '' }, children: [] }));
        }}
        onDelete={(node) => {
          space.db.remove(node);
        }}
      />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
