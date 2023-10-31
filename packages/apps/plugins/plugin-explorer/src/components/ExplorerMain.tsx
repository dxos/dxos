//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type View } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Explorer } from './Explorer';

export const ExplorerMain = ({ view }: { view: View }) => {
  const space = getSpaceForObject(view);
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Explorer space={space} />
    </Main.Content>
  );
};
