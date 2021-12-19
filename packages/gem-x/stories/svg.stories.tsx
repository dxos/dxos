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
      stroke: #EEE;
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
`

export const Primary = () => {
  const ref = useRef<SVGSVGElement>();

  // TODO(burdon): When to draw?
  useEffect(() => {
    const root = d3.select(ref.current)
      .append('g');

    // Grid.
    // TODO(burdon): Factor out grid.
    // TODO(burdon): Is the grid special?
    root.append('g').classed('grid', true)
      .append('path')
      .attr('d', gridPath());
  }, [ref]);

  const handleResize = (({ svg, width, height }) => {
    // TODO(burdon): Add momentum.
    // https://observablehq.com/@d3/zoom
    // https://www.d3indepth.com/zoom-and-pan
    d3.select(svg)
      .call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([1, 8])
      .on('zoom', zoomed));

    // TODO(burdon): Determine what to scale.
    // TODO(burdon): Custom: e.g., scale color, size of grid spacing, etc.
    function zoomed({ transform }) {
      const { k } = transform;
      const scale = 1 / k;
      const g = d3.select(svg).select('g');
      g.attr('transform', transform);
      g.selectAll('path').attr('stroke-width', scale);
      g.selectAll('circle').attr('stroke-width', scale);
    }
  });

  return (
    <FullScreen style={{
      backgroundColor: '#F5F5F5'
    }}>
      <SvgContainer
        ref={ref}
        className={style}
        onResize={handleResize}
      />
    </FullScreen>
  );
}

export const Secondary = () => {
  const ref = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(4), []);
  const scene = useMemo(() => testScene, []);

  useEffect(() => {
    const svg = ref.current;

    const grid = d3.select(svg).append('g').classed('grid', true)
      .append('path')
      .attr('d', gridPath());

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
      backgroundColor: '#F5F5F5'
    }}>
      <SvgContainer
        ref={ref}
        className={style}
      />
    </FullScreen>
  );
}
