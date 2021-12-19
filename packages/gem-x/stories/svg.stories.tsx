//
// Copyright 2020 DXOS.org
//

import * as d3 from "d3";
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer } from '../src';
import {
  Surface,
  createModel,
  scene as testScene
} from './helpers';

export default {
  title: 'SVG'
};

// TODO(burdon): Model class (and when to update).
// TODO(burdon): Scenes.
// TODO(burdon): Layout (e.g., force).
// TODO(burdon): Transitions (between scenes).

// TODO(burdon): Size?
const gridPath = () => {
  const range = d3.range(-40*32, 40*32, 32);
  const lines = range.reduce((result, i) => {
    result.push([[-1000, i], [1000, i]]);
    result.push([[i, -1000], [i, 1000]]);
    return result;
  }, []);

  return lines.map(line => d3.line()(line)).join();
};

const style = css`
  g.grid {
    path {
      stroke: #E5E5E5;
    }
  }

  // TODO(burdon): Custom style.
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

const createGrid = (svg) => {
  d3.select(svg).append('g').classed('grid', true)
    .append('path')
    .attr('d', gridPath());
};

export const Primary = () => {
  const ref = useRef<SVGSVGElement>();
  useEffect(() => {
    createGrid(ref.current);
  }, [ref]);

  return (
    <FullScreen style={{
      backgroundColor: '#F9F9F9'
    }}>
      <SvgContainer
        ref={ref}
        className={style}
      />
    </FullScreen>
  );
}

const handleResize = (({ svg, width, height }) => {
  // TODO(burdon): Add momentum.
  // https://observablehq.com/@d3/zoom
  // https://www.d3indepth.com/zoom-and-pan
  d3.select(svg)
  .call(d3.zoom()
  .extent([[0, 0], [width, height]])
  .scaleExtent([1, 8])
  .on('zoom', zoomed));

  function zoomed({ transform }) {
    const { k } = transform;
    const scale = 1 / k;

    const grid = d3.select(svg).select('g.grid');
    grid.attr('transform', transform);
    grid.selectAll('path').attr('stroke-width', scale);

    const objects = d3.select(svg).select('g.objects');
    objects.attr('transform', transform);
  }
});

export const Secondary = () => {
  const ref = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(4), []);
  const scene = useMemo(() => testScene, []);

  useEffect(() => {
    createGrid(ref.current);
  }, [ref]);

  useEffect(() => {
    const svg = ref.current;
    const objects = d3.select(svg).append('g').classed('objects', true);
    const surface = new Surface(svg, objects.node());

    scene.start(surface);
    scene.update(model);

    return () => {
      scene.stop();
    }
  }, [ref]);

  return (
    <FullScreen style={{
      backgroundColor: '#F9F9F9'
    }}>
      <SvgContainer
        ref={ref}
        className={style}
        onResize={handleResize}
      />
    </FullScreen>
  );
}
