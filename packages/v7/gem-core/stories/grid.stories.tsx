//
// Copyright 2020 DXOS.org
//

import React from 'react';
import useResizeAware from 'react-resize-aware';

import { FullScreen, Grid, SVG, useGrid } from '../src';

export default {
  title: 'Grid'
};

export const Primary = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  return (
    <FullScreen>
      {resizeListener}
      <SVG debug={true} width={size.width || 0} height={size.height || 0}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
      </SVG>
    </FullScreen>
  );
};
