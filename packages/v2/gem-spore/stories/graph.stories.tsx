//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/css';

import { useButton, useKnobs } from '@dxos/esbuild-book-knobs';
import { FullScreen, SvgContainer, gridStyles, useContext, useGrid, useStateRef, useZoom } from '@dxos/gem-core';

import { GraphForceProjector, GraphRenderer, Part, Surface, Scene } from '../src';

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
  const context = useContext();
  const gridRef = useGrid(context, { axis: false });
  const zoomRef = useZoom(context);

  const statsRef = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(2), []);
  const [scene, setScene, sceneRef] = useStateRef<Scene<TestModel>>();
  const Knobs = useKnobs();

  useButton('Test', () => {
    updateModel(model);
    sceneRef.current.update(model);
  });

  useEffect(() => {
    const scene = new Scene<TestModel>([
      new Part<TestModel, any>(
        new GraphForceProjector(graphMapper),
        new GraphRenderer(new Surface(context.svg, d3.select(zoomRef.current).node()))),
      new Part<TestModel, any>(
        new StatsProjector(statsMapper),
        new StatsRenderer(new Surface(context.svg, d3.select(statsRef.current).node())))
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
  }, []);

  return (
    <FullScreen>
      <SvgContainer context={context}>
        <g ref={gridRef} className={gridStyles} />
        <g ref={zoomRef} className={styles.graph} />
        <g ref={statsRef} className={styles.stats} />
      </SvgContainer>

      <Knobs className={styles.knobs} />
    </FullScreen>
  );
}
