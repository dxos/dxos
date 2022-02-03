//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { useButton, useKnobs } from '@dxos/esbuild-book-knobs';
import { FullScreen, SvgContainer, SvgContext, useGrid, useStateRef, useZoom } from '@dxos/gem-core';

import { GraphForceProjector, GraphRenderer, Part, Surface, Scene, GraphNode, createMarkers } from '../src';
import { statsMapper, StatsProjector, StatsRenderer, styles, TestItem } from './helpers';

import {
  TestModel,
  createModel,
  graphMapper,
  updateModel
} from './helpers';

export default {
  title: 'gem-x/Graph'
};

// TODO(burdon): Dynamic classname for nodes (e.g., based on selection).
// TODO(burdon): Create links.
// TODO(burdon): Delete nodes (alt-click).

export const Primary = () => {
  const context = useMemo(() => new SvgContext(), []);
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
      new Part<TestModel>(
        new GraphForceProjector(graphMapper),
        new GraphRenderer(new Surface(context.svg, d3.select(zoomRef.current).node()))
      )
    ]);

    const interval = setInterval(() => {
      if (model.items.length < 200) {
        updateModel(model);
        scene.update(model);
      }
    }, 10);

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
        <g ref={gridRef} className={styles.grid} />
        <g ref={zoomRef} className={styles.graph} />
        <g ref={statsRef} className={styles.stats} />
      </SvgContainer>

      <Knobs className={styles.knobs} />
    </FullScreen>
  );
}

export const Seconary = () => {
  const context = useMemo(() => new SvgContext(), []);
  const zoomRef = useZoom(context);

  const statsRef = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(3), []);
  const [scene, setScene, sceneRef] = useStateRef<Scene<TestModel>>();
  const Knobs = useKnobs();

  useButton('Test', () => {
    updateModel(model);
    sceneRef.current.update(model);
  });

  useEffect(() => {
    const scene = new Scene<TestModel>([
      new Part<TestModel>(
        new GraphForceProjector(graphMapper, {
          guides: true,
          forces: {
            manyBody: {
              strength: (count: number) => -100 -(count * 30)
            },
            center: true,
            link: {
              distance: 60
            }
          },
        }),
        new GraphRenderer(new Surface(context.svg, d3.select(zoomRef.current).node()), {
          label: node => node.id.substring(0, 4),
          nodeClass: (n: GraphNode<TestItem>) => n.data.type === 'org' ? 'selected' : undefined,
          bullets: true,
          arrows: {
            end: true
          }
        })
      ),
      new Part<TestModel>(
        new StatsProjector(statsMapper),
        new StatsRenderer(new Surface(context.svg, d3.select(statsRef.current).node()))
      )
    ]);

    scene.start();
    scene.update(model);
    setScene(scene);

    return () => {
      scene.stop();
    }
  }, []);

  const markersGroup = useRef<SVGSVGElement>();
  useEffect(() => {
    d3.select(markersGroup.current).call(createMarkers());
  }, [markersGroup]);

  return (
    <FullScreen>
      <SvgContainer context={context}>
        <g ref={markersGroup} className={styles.markers} />
        <g ref={zoomRef} className={styles.graph} />
        <g ref={statsRef} className={styles.stats} />
      </SvgContainer>

      <Knobs className={styles.knobs} />
    </FullScreen>
  );
}
