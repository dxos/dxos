//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useGlobalSearch } from '@dxos/plugin-search';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { D3ForceGraph } from './Graph';
import { useGraphModel } from '../hooks';
import { type ViewType } from '../types';

type ExplorerContainerProps = {
  role: string;
  view: ViewType;
};

const ExplorerContainer = ({ role, view }: ExplorerContainerProps) => {
  const space = getSpace(view);
  const model = useGraphModel(space);
  const { match } = useGlobalSearch();

  if (!space || !model) {
    return null;
  }

  return (
    <StackItem.Content size={role === 'section' ? 'square' : 'intrinsic'}>
      <D3ForceGraph model={model} match={match} />
    </StackItem.Content>
  );
};

export default ExplorerContainer;
