//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Tree as TreeType } from '@braneframe/types/proto';
import { getSpaceForObject } from '@dxos/react-client/echo';

import { Outliner } from './Outliner';

const TreeSection: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpaceForObject(tree);
  if (!space) {
    return null;
  }

  return (
    <Outliner.Root
      className='w-full plb-4'
      isTasklist={tree.checkbox}
      root={tree.root}
      onCreate={() => new TreeType.Item()}
      onDelete={({ id }) => {
        const item = space.db.getObjectById(id);
        item && space.db.remove(item);
      }}
    />
  );
};

export default TreeSection;
