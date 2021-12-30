//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { D3DragEvent } from 'd3';
import React, { useEffect, useRef, useState } from 'react';
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
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });

  const [shapes, setShapes] = useState<Shape[]>([
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
  ]);

  useEffect(() => {
    let start = undefined;
    let end = undefined;

    const drag = d3.drag()
      .filter(event => {
        return false; // TODO(burdon): Filter unless tool selected (since clashes with zoom).
      })
      .on('start', (event: D3DragEvent<any, any, any>) => {
        start = scale.map({ x: event.x, y: event.y }, true);
      })
      .on('drag', (event: D3DragEvent<any, any, any>) => {
        // const { x, y } = scale.map({ x: event.x, y: event.y }, true);
      })
      .on('end', (event: D3DragEvent<any, any, any>) => {
        end = scale.map({ x: event.x, y: event.y }, true);
        setShapes(shapes => [...shapes, {
          type: 'line',
          data: {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y
          }
        }])
      });

    if (false)
      d3.select(svgRef.current).call(drag);
  }, [svgRef]);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/8, 8]}
        grid
      >
        <g className={styles}>
          <Shapes
            scale={scale}
            shapes={shapes}
          />
        </g>
      </SvgContainer>
    </FullScreen>
  );
}
