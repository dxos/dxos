//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/css';

import {
  defaultGridStyles,
  EventEmitter,
  FullScreen,
  SvgContextProvider,
  useGrid,
  useSvgContext,
  useZoom,
} from '@dxos/gem-core';

export default {
  title: 'gem-x/experimental'
};

const useData = () => [
  { id: '1', cx: 0, cy: 0, r: 5 },
  { id: '2', cx: 30, cy: -10, r: 15 },
  { id: '3', cx: -30, cy: 60, r: 10 }
];

const useForce = (data: any[]) => {
  const update = new EventEmitter();

  useEffect(() => {
    const items = data;
    setTimeout(() => {
      update.emit({ items });
    })

    setInterval(() => {
      if (items.length < 50) {
        items.push({
          cx: (Math.random() - 0.5) * 800,
          cy: (Math.random() - 0.5) * 800,
          r: 5 + Math.random() * 10
        });
      }

      update.emit({ items });
    }, 200);
  }, []);

  return {
    update
  }
};

type GraphData = {
  items: [{ cx: number, cy: number, r: number }]
}

const useGraph = () => {
  const ref = useRef<SVGGElement>();

  return {
    ref,
    render: (data: GraphData) => {
      d3.select(ref.current)
        .selectAll('circle')
        .data(data.items)
        .join('circle')
        .attr('cx', d => d.cx)
        .attr('cy', d => d.cy)
        .attr('r', d => d.r);
    }
  };
}

interface ComponentProps {
  options?: {
    grid?: boolean
    zoom?: boolean
  }
}

const Component = ({ options = {} }: ComponentProps) => {
  const context = useSvgContext();

  // Grid
  const grid = useGrid();

  // Zoom
  const zoom = useZoom();

  // Graph
  const graph = useGraph();

  // Force
  const data = useData();
  const forceModel = useForce(data);
  useEffect(() => {
    return forceModel.update.on((layout: GraphData) => {
      graph.render(layout);
    });
  }, []);

  // NOTE: Natural layout of SVG elements; nothing hidden.
  return (
    <svg ref={context.ref} className={css`
      rect {
        stroke: pink;
        stroke-width: 1px;
        fill: none;
      }
      circle {
        stroke: darkblue;
        stroke-width: 2px;
        fill: none;
      }
    `}>
      <g ref={grid?.ref} className={defaultGridStyles} />
      <g ref={zoom?.ref}>
        <g ref={graph.ref} />
      </g>
    </svg>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <SvgContextProvider>
        <Component />
      </SvgContextProvider>
    </FullScreen>
  );
}
