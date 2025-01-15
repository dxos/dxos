//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/live-object';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';
import { TreeItemType, type TreeType } from '../types';

const OutlinerContainer = ({ tree, role }: { tree: TreeType; role: string }) => {
  const space = getSpace(tree);
  if (!space || !tree.root) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Outliner.Root
        className={mx(attentionSurface, 'p-4')}
        isTasklist={tree.checkbox}
        root={tree.root.target!}
        onCreate={(text?: string) => create(TreeItemType, { content: text ?? '', items: [] })}
        onDelete={({ id }) => {
          const item = space.db.getObjectById(id);
          item && space.db.remove(item);
        }}
      />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
