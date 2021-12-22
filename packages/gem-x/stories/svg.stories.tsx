//
// Copyright 2020 DXOS.org
//

import * as d3 from "d3";
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer } from '../src';

import {
  GraphForceProjector,
  GraphRenderer,
  Part,
  Surface,
  Scene,
  StatsProjector,
  StatsRenderer,
  TestModel,
  createModel,
  grid,
  graphMapper,
  statsMapper,
  updateModel
} from './helpers';

export default {
  title: 'SVG'
};

// TODO(burdon): Stats renderer.
// TODO(burdon): Pass groups to zoom.
// TODO(burdon): Transitions (between scenes).

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
  .scaleExtent([1/4, 8]) // TODO(burdon): Configure.
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
    path.axis {
      stroke: red;
    }
  }
  
  g.stats {
    text {
      font-family: monospace;
      font-size: 32px;
      fill: #999;
    }
  }

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
  const statsRef = useRef<SVGSVGElement>();
  const [scene, setScene] = useState<() => void>();

  useEffect(() => {
    const svg = ref.current;

    const scene = new Scene<TestModel>([
      new Part<TestModel, any>(
        new GraphForceProjector(graphMapper),
        new GraphRenderer(new Surface(svg, d3.select(objectsRef.current).node()))),
      new Part<TestModel, any>(
        new StatsProjector(statsMapper),
        new StatsRenderer(new Surface(svg, d3.select(statsRef.current).node())))
    ]);

    const model = createModel(2);
    const interval = setInterval(() => {
      if (model.items.length < 200) {
        updateModel(model);
        scene.update(model);
      }
    }, 50);

    scene.start();

    setScene(() => {
      scene.update(model);
    });

    return () => {
      clearInterval(interval);
      scene.stop();
    }
  }, [ref]);

  const handleResize = (({ width, height }) => {
    scene?.();

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
        <g className='stats' ref={statsRef} />
      </SvgContainer>
    </FullScreen>
  );
}
