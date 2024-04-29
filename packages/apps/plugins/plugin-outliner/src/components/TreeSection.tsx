//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { TextV0Type, TreeItemType, type TreeType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';

import { Outliner } from './Outliner';

const TreeSection: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpace(tree);
  if (!space || !tree.root) {
    return null;
  }

  return (
    <Outliner.Root
      className='w-full plb-4'
      isTasklist={tree.checkbox}
      root={tree.root}
      onCreate={() => create(TreeItemType, { text: create(TextV0Type, { content: '' }), items: [] })}
      onDelete={({ id }) => {
        const item = space.db.getObjectById(id);
        item && space.db.remove(item);
      }}
    />
  );
};

export default TreeSection;
