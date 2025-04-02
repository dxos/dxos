//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/live-object';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';
import { type OutlineType, TreeNodeType } from '../types';

const OutlinerContainer = ({ outline, role }: { outline: OutlineType; role: string }) => {
  const space = getSpace(outline);
  if (!space || !outline.tree.target) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Outliner.Root
        classNames={mx(attentionSurface, 'p-1.5')}
        tree={outline.tree.target}
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
