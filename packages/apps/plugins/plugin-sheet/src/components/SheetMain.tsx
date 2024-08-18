//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { Grid, type GridRootProps } from './Grid';

const SheetMain = ({ sheet }: GridRootProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div role='none' className='flex flex-col is-full bs-full mli-auto overflow-hidden'>
        <Grid.Root sheet={sheet}>
          <Grid.Main />
        </Grid.Root>
      </div>
    </Main.Content>
  );
};

export default SheetMain;
