//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useRef, useMemo, useState } from 'react';
import { css } from '@emotion/css';

import {
  FullScreen,
  Grid,
  SvgContainer,
  grid,
  useScale
} from '../src';

export default {
  title: 'gem-x/Grid'
};

/**
 * https://github.com/d3/d3-zoom#zoom_on
 * https://www.d3indepth.com/zoom-and-pan
 * @param width
 * @param height
 * @param listener
 */
// TODO(burdon): Add momentum.
const zoom = ({ width, height }, listener = undefined) => d3.zoom()
  .extent([[0, 0], [width, height]])
  .scaleExtent([1/4, 8]) // TODO(burdon): Configure.
  .on('zoom', ({ transform }) => {
    listener(transform);
  });

//
// Stories
//

const style = css`
  g.grid {
    path {
      stroke: #E5E5E5;
    }
    path.axis {
      stroke: red;
    }
  }
  
  g.shapes {
    circle {
      stroke: seagreen;
      stroke-width: 1;
      fill: none;
    }
    rect {
      stroke: orange;
      stroke-width: 1;
      fill: none;
    }
    path {
      stroke: orange;
      stroke-width: 4;
      fill: none;
    }
  }
  
  g.stats {
    text {
      font-family: monospace;
      font-size: 24px;
      fill: #999;
    }
  }

  g.objects {
    circle {
      stroke: seagreen;
      fill: #FFF;
    }
    path {
      stroke: orange;
      fill: none;
    }
  }
`;

export const Primary = () => {
  const [{ width, height }, setSize] = useState<{ width?, height? }>({});

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer className={style} onResize={size => setSize(size)}>
        <Grid width={width} height={height} />
      </SvgContainer>
    </FullScreen>
  );
}

export const Scale = () => {
  const [{ width, height }, setSize] = useState<{ width?, height? }>({});
  const scale = useScale({ gridSize: 16 });

  const shapes = useMemo(() => [
    {
      shape: 'circle', x: 0, y: 0, r: 2
    },
    {
      shape: 'rect', x: -1, y: -1, width: 2, height: 2
    },
    {
      shape: 'rect', x: -2, y: -2, width: 4, height: 4
    }
  ], []);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer className={style} onResize={size => setSize(size)}>
        <Grid scale={scale} width={width} height={height} />

        <g className='shapes'>
          {shapes.map(({ shape, x, y, width, height, r }, i) => (
            <g key={i}>
              {shape === 'circle' && (
                <circle x={scale.x(x)} y={scale.x(y)} r={scale.x(r)} />
              )}
              {shape === 'rect' && (
                <rect x={scale.x(x)} y={scale.x(y)} width={scale.x(width)} height={scale.x(height)} />
              )}
            </g>
          ))}
        </g>
      </SvgContainer>
    </FullScreen>
  );
}
