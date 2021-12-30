//
// Copyright 2020 DXOS.org
//

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/css';

import {
  FullScreen,
  Shape,
  Shapes,
  SvgContainer,
  useScale,
} from '../src';

export default {
  title: 'gem-x/Shapes'
};

const styles = css`
  circle {
    stroke: seagreen;
    stroke-width: 2;
    fill: none;
  }
  rect {
    stroke: orange;
    stroke-width: 1;
    fill: none;
  }
  line {
    stroke: orange;
    stroke-width: 4;
    fill: none;
  }
  path {
    stroke: orange;
    stroke-width: 4;
    fill: none;
  }
`;

export const Primary = () => {
  const scale = useScale({ gridSize: 32 });

  const shapes = useMemo<Shape[]>(() => [
    {
      type: 'circle', data: { x: 0, y: 0, r: [3, 1] }
    },
    {
      type: 'rect', data: { x: -1, y: -1, width: 2, height: 2 }
    },
    {
      type: 'rect', data: { x: [4, 1], y: [-2, 1], width: [8, 2], height: [12, 3] }
    },
    {
      type: 'line', data: { x1: 0, y1: 0, x2: 6, y2: 0 }
    },
    {
      type: 'circle', data: { x: 0, y: 0, r: [1, 4] }
    },
    {
      type: 'circle', data: { x: 6, y: 0, r: [1, 4] }
    }
  ], []);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        grid
        scale={scale}
        zoom={[1/8, 8]}
      >
        <g className={styles}>
          <Shapes scale={scale} shapes={shapes} />
        </g>
      </SvgContainer>
    </FullScreen>
  );
}
