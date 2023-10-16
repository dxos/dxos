//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/aurora';
import { Grid } from '@dxos/aurora-grid/next';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';

export const GridMain: FC<{ data: any }> = ({ data: grid }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid id='test' />
    </Main.Content>
  );
};
