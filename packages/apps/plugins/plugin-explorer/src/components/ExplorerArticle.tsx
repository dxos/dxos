//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useGlobalSearch } from '@braneframe/plugin-search';
import { type ViewType } from '@braneframe/types';
import { getSpace } from '@dxos/react-client/echo';

import { Graph } from './Graph';

const ExplorerArticle = ({ view }: { view: ViewType }) => {
  const space = getSpace(view);
  const { match } = useGlobalSearch();

  if (!space) {
    return null;
  }

  return (
    <div role='none' className='row-span-2 overflow-auto'>
      <Graph space={space} match={match} />
    </div>
  );
};

export default ExplorerArticle;
