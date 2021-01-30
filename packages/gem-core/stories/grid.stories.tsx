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

  return (
    <FullScreen>
      {resizeListener}
      <SVG debug={true} width={size.width || 0} height={size.height || 0}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
      </SVG>
    </FullScreen>
  );
};
