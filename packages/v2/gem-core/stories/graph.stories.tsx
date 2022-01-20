//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/css';

import { useButton, useKnobs } from '@dxos/esbuild-book-knobs';

import { Scale, useStateRef } from '../src';

import {
  FullScreen,
  GraphForceProjector,
  GraphRenderer,
  Part,
  Surface,
  Scene,
  SvgContainer
} from '../src';

import {
  StatsProjector,
  StatsRenderer,
  TestModel,
  createModel,
  graphMapper,
  statsMapper,
  updateModel
} from './helpers';

export default {
  title: 'gem-x/Graph'
};

const styles = {
  knobs: css`
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 8px;
  `,

  stats: css`
    text {
      font-family: monospace;
      font-size: 18px;
      fill: #999;
    }
  `,

  graph: css`
    circle {
      stroke: seagreen;
      fill: #FFF;
    }
    path {
      stroke: orange;
      fill: none;
    }
  `
};

export const Primary = () => {
  const svgRef = useRef<SVGSVGElement>();
  const graphRef = useRef<SVGSVGElement>();
  const statsRef = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(2), []);
  const [scene, setScene, sceneRef] = useStateRef<Scene<TestModel>>();
  const scale = useMemo(() => new Scale(32), []);
  const Knobs = useKnobs();

  useButton('Test', () => {
    updateModel(model);
    sceneRef.current.update(model);
  });

  useEffect(() => {
    const svg = svgRef.current;

    const scene = new Scene<TestModel>([
      new Part<TestModel, any>(
        new GraphForceProjector(graphMapper),
        new GraphRenderer(new Surface(svg, d3.select(graphRef.current).node()))),
      new Part<TestModel, any>(
        new StatsProjector(statsMapper),
        new StatsRenderer(new Surface(svg, d3.select(statsRef.current).node())))
    ]);

    const interval = setInterval(() => {
      if (model.items.length < 200) {
        updateModel(model);
        scene.update(model);
      }
    }, 50);

    scene.start();
    setScene(scene);

    return () => {
      clearInterval(interval);
      scene.stop();
    }
  }, [svgRef]);

  return (
    <FullScreen>
      <SvgContainer
        ref={svgRef}
        zoom={[1/4, 8]}
        zoomRoot={graphRef}
        scale={scale}
        grid
      >
        <g ref={graphRef} className={styles.graph} />
        <g ref={statsRef} className={styles.stats} />
      </SvgContainer>
      <Knobs className={styles.knobs} />
    </FullScreen>
  );
}
