//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';

import {
  FullScreen,
  SvgContainer,
  grid, ResizeCallbackProps,
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

const Grid = ({ width, height }) => {
  const ref = useRef<SVGSVGElement>();
  useEffect(() => {
    d3.select(ref.current)
      .call(grid({ width, height }));
  }, [width, height]);

  return (
    <g ref={ref} className='grid' />
  );
}

export const Primary = () => {
  const gridRef = useRef<SVGSVGElement>();

  const handleResize = (({ width, height }) => {
    d3.select(gridRef.current)
      .call(grid({ width, height }));
  });

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        className={style}
        onResize={handleResize}
      >
        <g className='grid' ref={gridRef} />
      </SvgContainer>
    </FullScreen>
  );
}

export const Secondary = () => {
  const [{ width, height }, setSize] = useState<{ width?, height? }>({});

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer className={style} onResize={size => setSize(size)}>
        <Grid width={width} height={height} />
      </SvgContainer>
    </FullScreen>
  );
}
