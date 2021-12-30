//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { Num } from '../frac';
import { Scale } from '../scale';

export type Circle = {
  x: number | Num
  y: number | Num
  r: number | Num
}

export type Rect = {
  x: number | Num
  y: number | Num
  width: number | Num
  height: number | Num
}

export type Line = {
  x1: number | Num
  y1: number | Num
  x2: number | Num
  y2: number | Num
}

// TODO(burdon): Path.
export type Shape = {
  type: string
  data: Circle | Rect | Line
}

export interface ShapesProps {
  scale: Scale,
  shapes?: Shape[]
}

export const Shapes = ({
  scale,
  shapes
}: ShapesProps) => {
  const gridRef = useRef<SVGSVGElement>();
  useEffect(() => {
    d3.select(gridRef.current)
      .selectAll('g')
      .data(shapes)
      .join('g')
      .each(({ type, data }, i, el) => {
        const root = d3.select(el[i]);
        switch (type) {
          case 'circle': {
            const { x, y, r } = (data as Circle);
            root.append('circle')
              .attr('cx', scale.x(x))
              .attr('cy', scale.x(y))
              .attr('r', scale.x(r));
            break;
          }

          case 'rect': {
            const { x, y, width, height } = (data as Rect);
            root.append('rect')
              .attr('x', scale.x(x))
              .attr('y', scale.x(y))
              .attr('width', scale.x(width))
              .attr('height', scale.x(height));
            break;
          }

          case 'line': {
            const { x1, y1, x2, y2 } = (data as Line);
            root.append('line')
              .attr('x1', scale.x(x1))
              .attr('y1', scale.x(y1))
              .attr('x2', scale.x(x2))
              .attr('y2', scale.x(y2));
            break;
          }
        }
      });
  }, [gridRef, shapes])

  return (
    <g ref={gridRef} />
  );
};
