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

export type PathType = 'linear' | 'basis' | 'cardinal' | 'step';

const getCurve = (type: PathType, closed: boolean) => {
  const curves = {
    open: {
      linear: d3.curveLinear,
      basis: d3.curveBasis,
      cardinal: d3.curveCardinal,
      step: d3.curveStep
    },
    closed: {
      linear: d3.curveLinearClosed,
      basis: d3.curveBasisClosed,
      cardinal: d3.curveCardinalClosed,
      step: d3.curveStep
    }
  }

  return curves[closed ? 'closed' : 'open'][type];
}

export type Path = {
  type?: PathType
  closed?: boolean
  points: [ x: number, y: number ][]
}

export type Shape = {
  id: string
  type: string
  data: Circle | Rect | Line | Path
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

    case 'path': {
      root.append('path');
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
        .attr('cx', scale.mapToScreen(x))
        .attr('cy', scale.mapToScreen(y))
        .attr('r', scale.mapToScreen(r));
      break;
    }

    case 'rect': {
      const { x, y, width, height } = (data as Rect);
      root.select('rect')
        .attr('x', scale.mapToScreen(x))
        .attr('y', scale.mapToScreen(y))
        .attr('width', scale.mapToScreen(width))
        .attr('height', scale.mapToScreen(height));
      break;
    }

    case 'line': {
      const { x1, y1, x2, y2 } = (data as Line);
      root.select('line')
        .attr('x1', scale.mapToScreen(x1))
        .attr('y1', scale.mapToScreen(y1))
        .attr('x2', scale.mapToScreen(x2))
        .attr('y2', scale.mapToScreen(y2));
      break;
    }

    case 'path': {
      // https://github.com/d3/d3-shape/#lines
      const { type, closed, points } = (data as Path);
      const curve = getCurve(type, closed);
      const line = curve ? d3.line().curve(curve) : d3.line();
      root.select('path')
        .attr('d', line(points.map(([ x, y ]) => [scale.mapToScreen(x), scale.mapToScreen(y)])));
      break;
    }
  }
};

export interface ShapesProps {
  scale: Scale,
  cursor?: Shape
  shapes?: Shape[]
  className?: string
}

export const Shapes = ({
  scale,
  cursor,
  shapes,
  className,
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
    <g
      ref={gridRef}
      className={className}
    />
  );
};
