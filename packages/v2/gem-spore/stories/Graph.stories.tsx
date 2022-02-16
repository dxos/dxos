//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { FullScreen, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';

import {
  convertTreeToGraph,
  createGraph,
  createTree,
  Graph,
  GraphLayoutNode,
  Markers,
  TestGraphModel,
  TestNode,
} from '../src';

export default {
  title: 'gem-spore/Graph'
};

export const Primary = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom extent={[1/2, 2]}>
            <Graph
              arrows
              drag
              model={model}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};

export const Secondary = ({ graph = true }) => {
  const selected = useMemo(() => new Set(), []);
  const model = useMemo(() => {
    return graph ?
      new TestGraphModel(createGraph(30, 20)) :
      new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 })))
  }, []);

  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom extent={[1/2, 2]}>
            <Graph
              arrows
              forces={{
                link: {
                  distance: 30,
                  iterations: 3
                },
                radial: {
                  strength: 0.01
                }
              }}
              drag
              model={model}
              labels={{
                text: (node: GraphLayoutNode<TestNode>, highlight: boolean) =>
                  highlight || selected.has(node.id) ? node.data.label : undefined
              }}
              attributes={{
                node: (node: GraphLayoutNode<TestNode>) => ({
                  class: selected.has(node.id) ? 'selected' : undefined,
                  // radius: 8 // TODO(burdon): Apply to projector (not renderer).
                })
              }}
              onSelect={(node: GraphLayoutNode<TestNode>) => {
                if (selected.has(node.id)) {
                  selected.delete(node.id);
                } else {
                  selected.add(node.id);
                }

                model.update();
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};
