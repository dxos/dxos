//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { useButton, useKnobs } from '@dxos/esbuild-book-knobs';
import { FullScreen, SvgContainer, SvgContext, useGrid, useStateRef, useZoom } from '@dxos/gem-core';

import { GraphForceProjector, GraphRenderer, Part, Surface, Scene, createMarkers, GraphNode } from '../src';
import { styles, TestItem } from './helpers';

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
  title: 'gem-x/Animation'
};

// TODO(burdon): Dynamic classname for nodes (e.g., based on selection).
// TODO(burdon): Create links.
// TODO(burdon): Delete nodes (alt-click).

export const Primary = () => {
  const context = useMemo(() => new SvgContext(), []);
  const gridRef = useGrid(context, { axis: false });
  const zoomRef = useZoom(context);

  const statsRef = useRef<SVGSVGElement>();
  const model = useMemo(() => createModel(4), []);
  const [scene, setScene, sceneRef] = useStateRef<Scene<TestModel>>();
  const Knobs = useKnobs();

  useButton('Test', () => {
    updateModel(model);
    sceneRef.current.update(model);
  });

  useEffect(() => {
    const scene = new Scene<TestModel>([
      new Part<TestModel, any, any>(
        new GraphForceProjector(graphMapper, {
          forces: {
            center: true,
            link: {
              distance: 40
            },
            charge: true
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
      new Part<TestModel, any, any>(
        new StatsProjector(statsMapper),
        new StatsRenderer(new Surface(context.svg, d3.select(statsRef.current).node()))
      )
    ]);

    // TODO(burdon): Factor out.
    const interval = setInterval(() => {
      if (model.items.length < 50) {
        updateModel(model);
        scene.update(model);
      }
    }, 10);

    scene.start();
    scene.update(model);

    setScene(scene);

    return () => {
      clearInterval(interval);
      scene.stop();
    }
  }, []);

  // TODO(burdon): Factor out.
  const markersGroup = useRef<SVGSVGElement>();
  useEffect(() => {
    d3.select(markersGroup.current).call(createMarkers());
  }, [markersGroup]);

  return (
    <FullScreen>
      <SvgContainer context={context}>
        <g ref={markersGroup} className={styles.markers} />
        <g ref={gridRef} className={styles.grid} />
        <g ref={zoomRef} className={styles.graph} />
        <g ref={statsRef} className={styles.stats} />
      </SvgContainer>

      <Knobs className={styles.knobs} />
    </FullScreen>
  );
}
