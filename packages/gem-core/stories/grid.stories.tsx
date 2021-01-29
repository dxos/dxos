//
// Copyright 2020 DXOS.org
//

import React from 'react';
import useResizeAware from 'react-resize-aware';

import { withKnobs } from '@storybook/addon-knobs';

import { FullScreen, SVG, Grid, useGrid } from '../src';

export default {
  title: 'Grid',
  decorators: [withKnobs]
};

// TODO(burdon): Name?
export const withGrid = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);
  const { width, height } = size;

  return (
    <FullScreen>
      {resizeListener}
      <SVG debug={true} width={width} height={height}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
      </SVG>
    </FullScreen>
  );
};
