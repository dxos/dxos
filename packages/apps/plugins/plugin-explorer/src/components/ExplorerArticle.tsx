//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSearch } from '@braneframe/plugin-search';
import { type ViewType } from '@braneframe/types';
import { getSpace } from '@dxos/react-client/echo';

import { Graph } from './Graph';

const ExplorerArticle = ({ view }: { view: ViewType }) => {
  const space = getSpace(view);
  const { match } = useSearch();

  if (!space) {
    return null;
  }

  return (
    <div role='none' className='is-full row-span-2'>
      <Graph space={space} match={match} />
    </div>
  );
};

export default ExplorerArticle;
