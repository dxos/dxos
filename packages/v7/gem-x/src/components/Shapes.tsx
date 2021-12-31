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
  id: string
  type: string
  data: Circle | Rect | Line
}

const createShape = (root, shape, scale) => {
  const { type } = shape;
  switch (type) {
    case 'circle': {
      root.append('circle');
      updateShape(root, shape, scale);
      break;
    }

    case 'rect': {
      root.append('rect');
      updateShape(root, shape, scale);
      break;
    }

    case 'line': {
      root.append('line');
      updateShape(root, shape, scale);
      break;
    }
  }
};

const updateShape = (root, shape, scale) => {
  const { type, data } = shape;
  switch (type) {
    case 'circle': {
      const { x, y, r } = (data as Circle);
      root.select('circle')
        .attr('cx', scale.x(x))
        .attr('cy', -scale.x(y))
        .attr('r', scale.x(r));
      break;
    }

    case 'rect': {
      const { x, y, width, height } = (data as Rect);
      root.select('rect')
        .attr('x', scale.x(x))
        .attr('y', -(scale.x(y) + scale.x(height)))
        .attr('width', scale.x(width))
        .attr('height', scale.x(height));
      break;
    }

    case 'line': {
      const { x1, y1, x2, y2 } = (data as Line);
      root.select('line')
        .attr('x1', scale.x(x1))
        .attr('y1', -scale.x(y1))
        .attr('x2', scale.x(x2))
        .attr('y2', -scale.x(y2));
      break;
    }
  }
};

export interface ShapesProps {
  scale: Scale,
  cursor?: Shape
  shapes?: Shape[]
}

export const Shapes = ({
  scale,
  cursor,
  shapes
}: ShapesProps) => {
  const gridRef = useRef<SVGSVGElement>();

  useEffect(() => {
    d3.select(gridRef.current)
      .selectAll('g')
      // https://github.com/d3/d3-selection#selection_data
      .data([...shapes, cursor].filter(Boolean), (shape: Shape) => shape.id)
      // https://github.com/d3/d3-selection#selection_join
      .join(
        enter => {
          const root = enter.append('g');
          root.each((data, i, el) => createShape(d3.select(el[i]), data, scale));
          return root;
        },
        update => {
          update.each((data, i, el) => updateShape(d3.select(el[i]), data, scale));
          return update;
        },
        exit => {
          exit.remove()
        }
      )
  }, [gridRef, cursor, shapes])

  return (
    <g ref={gridRef} />
  );
};
