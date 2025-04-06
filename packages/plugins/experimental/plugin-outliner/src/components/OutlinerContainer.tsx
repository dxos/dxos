//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';
import { useOutlinerHandlers } from '../hooks';
import { type TreeType } from '../types';

const OutlinerContainer = ({ role, tree }: { role: string; tree: TreeType }) => {
  const space = getSpace(tree);
  const handlers = useOutlinerHandlers(space);
  if (!tree) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Outliner.Root classNames={mx(attentionSurface, 'p-1.5')} tree={tree} {...handlers} />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
