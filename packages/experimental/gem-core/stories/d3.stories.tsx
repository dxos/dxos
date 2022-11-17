//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import * as d3 from 'd3';
import React, { useEffect } from 'react';

import {
  Bounds,
  FractionUtil,
  FullScreen,
  Scale,
  SVGContext,
  SVGContextProvider,
  Vector,
  Vertex,
  defaultGridStyles,
  useGrid,
  useZoom,
  useSvgContext
} from '../src';

export default {
  title: 'gem-x/D3'
};

// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
const styles = css`
  circle,
  rect,
  path {
    stroke: seagreen;
    stroke-width: 2;
    fill: #eee;
    opacity: 0.4;
  }

  g.style-1 {
    // TODO(burdon): Serialize into item properties (proto).
    rect {
      stroke: red;
      stroke-width: 4;
    }
    text {
      font-family: sans-serif;
    }
  }
`;

type DataItem = {
  type: string;
  data: {
    bounds?: Bounds;
    pos?: Vertex;
    points?: [];
    r?: Vector;
    text?: string;
    class?: string;
    style?: any; // TODO(burdon): Shared style mixin (rect, text, etc).
    curve?: string; // TODO(burdon): Type-specific or sub object?
    closed?: boolean;
  };
};

// TODO(burdon): To Util.
const convertPoints = (array) =>
  array.map(([x, y]) => ({
    x: FractionUtil.toFraction(x),
    y: FractionUtil.toFraction(y)
  }));

// TODO(burdon): Hook.
const data: DataItem[] = [
  {
    type: 'circle',
    data: {
      pos: { x: [0, 1], y: [3, 1] },
      r: [3, 2],
      text: 'Circle'
    }
  },
  {
    type: 'rect',
    data: {
      bounds: { x: [-2, 1], y: [1, 1], width: [4, 1], height: [8, 2] }
    }
  },
  {
    type: 'text',
    data: {
      bounds: { x: [-2, 1], y: [5, 1], width: [4, 1], height: [1, 1] },
      text: 'Text',
      style: {
        'text-anchor': 'end'
      }
    }
  },
  {
    type: 'rect',
    data: {
      bounds: { x: [4, 1], y: [1, 1], width: [4, 1], height: [4, 1] },
      class: 'style-1',
      style: { rx: [1, 1], 'font-size': 24 },
      text: 'Rect'
    }
  },
  {
    type: 'path',
    data: {
      points: convertPoints([
        [8, -2],
        [8, -6],
        [4, -9],
        [-2, -2]
      ]),
      curve: 'cardinal',
      closed: true
    }
  },
  {
    type: 'path',
    data: {
      points: convertPoints([
        [-8, 1],
        [-4, 1],
        [-6, 5]
      ]),
      closed: true
    }
  }
];

const updateCircle = (el, scale, { pos, r }) => {
  const [cx, cy] = scale.model.toPoint(pos);
  return el
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', scale.model.toValues([r])[0]);
};

const updateText = (el, scale, { style = {}, bounds, pos, text }) => {
  const anchor = style['text-anchor'] ?? 'middle';
  let [x = 0, y = 0] = [];
  if (pos) {
    [x, y] = scale.model.toPoint(pos);
  } else {
    switch (anchor) {
      case 'start': {
        [x, y] = scale.model.toPoint(Vector.left(bounds));
        break;
      }
      case 'end': {
        [x, y] = scale.model.toPoint(Vector.right(bounds));
        break;
      }
      case 'middle':
      default: {
        [x, y] = scale.model.toPoint(Vector.center(bounds));
        break;
      }
    }
  }

  return el
    .style('dominant-baseline', 'middle')
    .style('text-anchor', anchor)
    .style('font-size', style['font-size'])
    .style('font-family', style['font-family'])
    .attr('x', x)
    .attr('y', y)
    .text(text);
};

const updateRect = (el, scale, { bounds, style }) => {
  const { x, y, width, height } = scale.model.toBounds(bounds);
  const { rx } = style ?? {};
  return el
    .attr('rx', rx ? scale.model.toValues([rx])[0] : undefined)
    .attr('x', x)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height);
};

const updatePath = (el, scale, { points, curve, closed }) => {
  const p = points.map((p) => scale.model.toPoint(p));
  let line;
  switch (curve) {
    case 'cardinal': {
      line = closed ? d3.curveCardinalClosed : d3.curveCardinal;
      break;
    }
    case 'basis': {
      line = closed ? d3.curveBasisClosed : d3.curveBasis;
      break;
    }
    default: {
      line = closed ? d3.curveLinearClosed : d3.curveLinear;
    }
  }
  return el.attr('d', d3.line().curve(line)(p));
};

const Component = () => {
  const context = useSvgContext();
  const grid = useGrid();
  const zoom = useZoom();

  useEffect(() => {
    const scale = context.scale;
    d3.select(zoom.ref.current)
      .selectAll('g')
      .data(data)
      .join('g')
      .each(({ type, data }, i, nodes) => {
        const el = d3.select(nodes[i]).attr('class', data.class);

        switch (type) {
          case 'circle': {
            const { style, pos, text } = data;
            el.selectAll('circle').data([0]).join('circle').call(updateCircle, scale, data);
            el.selectAll('text')
              .data(text ? [1] : [])
              .join('text')
              .call(updateText, scale, { style, pos, text });
            break;
          }

          case 'rect': {
            const { style, bounds, text } = data;
            const pos = Vector.center(bounds as Bounds);
            el.selectAll('rect').data([0]).join('rect').call(updateRect, scale, data);
            el.selectAll('text')
              .data(text ? [1] : [])
              .join('text')
              .call(updateText, scale, { style, pos, text });
            break;
          }

          case 'text': {
            const { style, bounds, text } = data;
            el.selectAll('text')
              .data(text ? [1] : [])
              .join('text')
              .call(updateText, scale, { style, bounds, text });
            break;
          }

          case 'path': {
            const { points } = data;
            el.selectAll('path').data([0]).join('path').call(updatePath, scale, data);
            el.selectAll('circle')
              .data(points)
              .join('circle')
              .each((pos, i, nodes) => {
                const [cx, cy] = scale.model.toPoint(pos);
                return d3
                  .select(nodes[i])
                  .attr('cx', cx)
                  .attr('cy', cy)
                  .attr('r', scale.model.toValues([[1, 8]])[0]);
              });
            break;
          }
        }
      });
  }, [zoom]);

  return (
    <svg xmlns='http://www.w3.org/2000/svg' ref={context.ref} className={styles}>
      <g ref={grid?.ref} className={defaultGridStyles} />
      <g ref={zoom?.ref} />
    </svg>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <SVGContextProvider context={new SVGContext(new Scale(64))}>
        <Component />
      </SVGContextProvider>
    </FullScreen>
  );
};
