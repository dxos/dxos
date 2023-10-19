//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';

export type ExplorerMainParams = {};

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

export const ExplorerMain: FC<ExplorerMainParams> = () => {
  return (
    <div className='flex grow ring m-2'>
      <SVGContextProvider>
        <SVG className={slots?.root?.className}>
          <Markers arrowSize={6} />
          <Grid className={slots?.grid?.className} />
          <Zoom extent={[1, 4]}>
            <View />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </div>
  );
};

const View = () => {
  return <g />;
};
