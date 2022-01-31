//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/css';

import {
  Bounds,
  FractionUtil,
  FullScreen,
  gridStyles,
  Scale,
  SvgContainer,
  useContext,
  useGrid, useZoom,
  Vector,
  Vertex,
} from '../src';

export default {
  title: 'gem-x/D3'
};

// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
const styles = css`
  circle, rect, path {
    stroke: seagreen;
    stroke-width: 2;
    fill: #EEE;
    opacity: 0.4;
  }
  
  g.style-1 { // TODO(burdon): Serialize into item properties (proto).
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
  type: string
  data: {
    bounds?: Bounds
    pos?: Vertex
    points?: []
    r?: Vector
    text?: string
    class?: string
    style?: any // TODO(burdon): Shared style mixin (rect, text, etc).
    curve?: string // TODO(burdon): Type-specific or sub object?
    closed?: boolean
  }
}

// TODO(burdon): To Util.
const convertPoints = array => array.map(([x, y]) => ({
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
    },
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
      points: convertPoints([[8, -2], [8, -6], [4, -9], [-2, -2]]),
      curve: 'cardinal',
      closed: true
    }
  },
  {
    type: 'path',
    data: {
      points: convertPoints([[-8, 1], [-4, 1], [-6, 5]]),
      closed: true
    }
  }
];

export const Primary = () => {
  const context = useContext();
  const gridRef = useGrid(context, { axis: false });
  const zoomRef = useZoom(context);
  const scale = context.scale;

  useEffect(() => {
    const updateCircle = (el, { pos, r }) => {
      const [cx, cy] = scale.model.toPoint(pos);
      return el
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', scale.model.toValues([r])[0]);
    };

    const updateText = (el, { style = {}, bounds, pos, text }) => {
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

    const updateRect = (el, { bounds, style }) => {
      const { x, y, width, height } = scale.model.toBounds(bounds);
      const { rx } = style ?? {};
      return el
        .attr('rx', rx ? scale.model.toValues([rx])[0] : undefined)
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height);
    };

    const updatePath = (el, { points, curve, closed }) => {
      const p = points.map(p => scale.model.toPoint(p));
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
      return el
        .attr('d', d3.line().curve(line)(p));
    };

    d3.select(zoomRef.current)
      .selectAll('g')
      .data(data)
      .join('g')
      .each(({ type, data }, i, nodes) => {
        const el = d3.select(nodes[i])
          .attr('class', data['class']);

        switch (type) {
          case 'circle': {
            const { style, pos, text } = data;
            el.selectAll('circle').data([0]).join('circle')
              .call(updateCircle, data);
            el.selectAll('text').data(text ? [1] : []).join('text')
              .call(updateText, { style, pos, text });
            break;
          }

          case 'rect': {
            const { style, bounds, text } = data;
            const pos = Vector.center(bounds as Bounds);
            el.selectAll('rect').data([0]).join('rect')
              .call(updateRect, data);
            el.selectAll('text').data(text ? [1] : []).join('text')
              .call(updateText, { style, pos, text });
            break;
          }

          case 'text': {
            const { style, bounds, text } = data;
            el.selectAll('text').data(text ? [1] : []).join('text')
              .call(updateText, { style, bounds, text });
            break;
          }

          case 'path': {
            const { points } = data;
            el.selectAll('path').data([0]).join('path')
              .call(updatePath, data);
            el.selectAll('circle').data(points).join('circle')
              .each((pos, i, nodes) => {
                const [cx, cy] = scale.model.toPoint(pos);
                return d3.select(nodes[i])
                  .attr('cx', cx)
                  .attr('cy', cy)
                  .attr('r', scale.model.toValues([[1, 8]])[0]);
              })
            break;
          }
        }
      });
  }, [zoomRef]);

  return (
    <FullScreen>
      <SvgContainer context={context}>
        <g ref={gridRef} className={gridStyles} />
        <g ref={zoomRef} className={styles} />
      </SvgContainer>
    </FullScreen>
  )
}
