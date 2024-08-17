//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Grid, type GridRootProps } from './Grid';

const SheetSection = ({ sheet }: GridRootProps) => {
  return (
    <div role='none' className='flex flex-col aspect-square is-full overflow-auto'>
      <Grid.Root sheet={sheet}>
        <Grid.Main />
      </Grid.Root>
    </div>
  );
};

export default SheetSection;
