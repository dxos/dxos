//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { TextV0Type, TreeItemType, type TreeType } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { getSpaceForObject } from '@dxos/react-client/echo';

import { Outliner } from './Outliner';

const TreeSection: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpaceForObject(tree);
  if (!space || !tree.root) {
    return null;
  }

  return (
    <Outliner.Root
      className='w-full plb-4'
      isTasklist={tree.checkbox}
      root={tree.root}
      onCreate={() => E.object(TreeItemType, { text: E.object(TextV0Type, { content: '' }), items: [] })}
      onDelete={({ id }) => {
        const item = space.db.getObjectById(id);
        item && space.db.remove(item);
      }}
    />
  );
};

export default TreeSection;
