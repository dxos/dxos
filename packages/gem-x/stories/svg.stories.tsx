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

const createGrid = ({ width, height }, transform = undefined) => {
  const { x = 0, y = 0, k = 1 } = transform || {};
  const s = 1 / k;

  // TODO(burdon): Based on zoom.
  const gridSize = 32;
  const mod = n => (Math.floor(n / gridSize + 1) * gridSize);
  const xRange = d3.range(-mod((x + width / 2) * s), mod((-x + width / 2) * s), gridSize);
  const yRange = d3.range(-mod((y + height / 2) * s), mod((-y + height / 2) * s), gridSize);

  const w = width * s;
  const h = height * s;
  const dx = -(x + width / 2) * s;
  const dy = -(y + height / 2) * s;

  // Create array of paths.
  const lines = [
    ...xRange.map(x => [[x, dy], [x, dy + h]]),
    ...yRange.map(y => [[dx, y], [dx + w, y]])
  ];

  const createLine = d3.line();
  return lines.map(line => createLine(line as any)).join();
};

// TODO(burdon): Customize grid.
const grid = ({ width, height }, transform = undefined) => (el) => {
  el.selectAll('path').data([{ id: 'grid' }]).join('path').attr('d', createGrid({ width, height }, transform));

  if (transform) {
    el.attr('transform', transform);
    // path.attr('stroke-width', 1 / transform.k);
  }
}

/**
 * https://github.com/d3/d3-zoom#zoom_on
 * https://www.d3indepth.com/zoom-and-pan
 * @param width
 * @param height
 * @param listener
 */
// TODO(burdon): Add momentum.
const zoom = ({ width, height }, listener = undefined) => d3.zoom()
  .extent([[0, 0], [width, height]])
  .scaleExtent([-8, 8]) // TODO(burdon): Configure.
  .on('zoom', ({ transform }) => {
    listener(transform);
  });

//
// Stories
//

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

export const Primary = () => {
  const gridRef = useRef<SVGSVGElement>();

  const handleResize = (({ width, height }) => {
    d3.select(gridRef.current)
      .call(grid({ width, height }));
  });

  return (
    <FullScreen style={{
      backgroundColor: '#F9F9F9'
    }}>
      <SvgContainer
        className={style}
        onResize={handleResize}
      >
        <g className='grid' ref={gridRef} />
      </SvgContainer>
    </FullScreen>
  );
}

export const Secondary = () => {
  const ref = useRef<SVGSVGElement>();
  const gridRef = useRef<SVGSVGElement>();
  const objectsRef = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(4), []);
  const scene = useMemo(() => testScene, []);

  useEffect(() => {
    const svg = ref.current;
    const objects = d3.select(objectsRef.current);
    const surface = new Surface(svg, objects.node());
    scene.start(surface);
    scene.update(model);

    return () => {
      scene.stop();
    }
  }, [ref]);

  const handleResize = (({ width, height }) => {
    d3.select(gridRef.current)
      .call(grid({ width, height }));

    d3.select(ref.current)
      .call(zoom({ width, height }, (transform) => {
        // Update grid.
        d3.select(gridRef.current).call(grid({ width, height }, transform));
        // Update objects.
        d3.select(objectsRef.current).attr('transform', transform);
      }));
  });

  return (
    <FullScreen style={{
      backgroundColor: '#F9F9F9'
    }}>
      <SvgContainer
        ref={ref}
        className={style}
        onResize={handleResize}
      >
        <g className='grid' ref={gridRef} />
        <g className='objects' ref={objectsRef} />
      </SvgContainer>
    </FullScreen>
  );
}
