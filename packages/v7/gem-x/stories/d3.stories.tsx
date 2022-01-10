//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/css';

import { Bounds2, Frac, FullScreen, SvgContainer, useScale } from '../src';

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

export const Primary = () => {
  const groupRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });

  // Test join updates single item.
  // https://github.com/d3/d3-selection#selection_data
  // https://github.com/d3/d3-selection#selection_join

  // TODO(burdon): Design
  //  - Types (consider mutations, protobuf).
  //  - Frac vs number type names and utils (symmetric).

  const data = [
    {
      type: 'circle',
      data: {
        pos: [0, [3, 1]], // TODO(burdon): x, y for model (protobuf).
        r: [3, 2],
        text: 'Circle'
      }
    },
    {
      type: 'rect',
      data: {
        bounds: { x: [-2, 1], y: [1, 1], width: 4, height: [8, 2] }
      }
    },
    {
      type: 'rect',
      data: {
        bounds: { x: 4, y: 1, width: 4, height: 4 },
        class: 'style-1',
        style: { rx: 1, 'font-size': 24 }, // TODO(burdon): Shared style mixin (rect, text, etc). Clash?
        text: 'Rect'
      }
    },
    {
      type: 'path',
      data: {
        points: [[0, -1], [8, -2], [8, -6], [0, -9], [-6, -6], [-8, -2]],
        curve: 'basis',
        closed: true
      }
    },
    {
      type: 'path',
      data: {
        points: [[-8, 1], [-4, 1], [-6, 5]],
        closed: true
      }
    }
  ];

  useEffect(() => {
    const updateCircle = (el, { pos, r }) => {
      const [x, y] = scale.model.toPoint(pos);
      return el
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', scale.model.toValues([r])[0]);
    };

    const updateText = (el, { style = {}, pos, text }) => {
      const [x, y] = scale.model.toPoint(pos);
      return el
        .style('dominant-baseline', 'middle')
        .style('text-anchor', 'middle')
        .style('font-size', style['font-size']) // TODO(burdon): One-off, but also by class.
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

    d3.select(groupRef.current)
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
            const pos = Frac.center(bounds as Bounds2);
            el.selectAll('rect').data([0]).join('rect')
              .call(updateRect, data);
            el.selectAll('text').data(text ? [1] : []).join('text')
              .call(updateText, { style, pos, text });
            break;
          }

          case 'path': {
            el.selectAll('path').data([0]).join('path')
              .call(updatePath, data);
            break;
          }
        }
      });
  }, [groupRef]);

  return (
    <FullScreen>
      <SvgContainer
        grid
        scale={scale}
      >
        <g
          ref={groupRef}
          className={styles}
        />
      </SvgContainer>
    </FullScreen>
  )
}
