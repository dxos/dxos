//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSearch } from '@braneframe/plugin-search';
import { type View } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Graph } from './Graph';

const ExplorerMain = ({ view }: { view: View }) => {
  const space = getSpaceForObject(view);
  const { match } = useSearch();
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <Graph space={space} match={match} />
    </Main.Content>
  );
};

export default ExplorerMain;
