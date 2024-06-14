//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useGlobalSearch } from '@braneframe/plugin-search';
import { type ViewType } from '@braneframe/types';
import { getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Graph } from './Graph';

const ExplorerMain = ({ view }: { view: ViewType }) => {
  const space = getSpace(view);
  const { match } = useGlobalSearch();
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <Graph space={space} match={match} />
    </Main.Content>
  );
};

export default ExplorerMain;
