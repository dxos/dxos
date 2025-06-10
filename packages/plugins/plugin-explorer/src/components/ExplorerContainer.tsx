//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useGlobalSearch } from '@dxos/plugin-search';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { ForceGraph } from './Graph';
import { useGraphModel } from '../hooks';
import { type ViewType } from '../types';

type ExplorerContainerProps = {
  role: string;
  view: ViewType;
};

const ExplorerContainer = ({ role, view }: ExplorerContainerProps) => {
  const space = getSpace(view);
  const { match } = useGlobalSearch();
  const model = useGraphModel(space);

  if (!model || !space) {
    return null;
  }

  return (
    <StackItem.Content size={role === 'section' ? 'square' : 'intrinsic'}>
      <ForceGraph model={model} match={match} />
    </StackItem.Content>
  );
};

export default ExplorerContainer;
