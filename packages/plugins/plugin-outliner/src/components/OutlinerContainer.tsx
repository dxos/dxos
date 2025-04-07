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
    <StackItem.Content role={role} toolbar={false} classNames='container-max-width'>
      <Outliner.Root classNames={mx(attentionSurface, 'pbs-2')} tree={tree} {...handlers} />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
