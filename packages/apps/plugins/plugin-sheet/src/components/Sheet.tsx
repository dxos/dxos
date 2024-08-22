//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type LayoutCoordinate } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { Grid, type GridRootProps } from './Grid';

const Sheet = ({
  sheet,
  role,
  coordinate = { part: 'main', entryId: '' },
}: GridRootProps & { role?: string; coordinate?: LayoutCoordinate }) => {
  return (
    <div role='none' className={mx(role === 'section' && 'aspect-square', role === 'article' && 'row-span-2')}>
      <Grid.Root sheet={sheet}>
        <Grid.Main
          classNames={['border-bs', coordinate.part !== 'solo' && 'border-is', role === 'section' && 'border-be']}
        />
      </Grid.Root>
    </div>
  );
};

export default Sheet;
