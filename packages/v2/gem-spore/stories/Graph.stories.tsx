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
  GraphNode,
  Markers,
  TestGraphModel,
  TestGraphModelAdapter,
  TestNode,
} from '../src';

export default {
  title: 'gem-spore/Graph'
};

export const Primary = ({ graph = false }) => {
  const selected = useMemo(() => new Set(), []);
  const model = useMemo(() => {
    return graph ?
      new TestGraphModelAdapter(new TestGraphModel(createGraph(30, 20))) :
      new TestGraphModelAdapter(new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))))
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
                manyBody: {
                  distanceMax: 300,
                  strength: () => -150
                }
              }}
              drag
              model={model}
              labels={{
                text: (node: GraphNode<TestNode>, highlight: boolean) =>
                  highlight || selected.has(node.id) ? node.data.label : undefined
              }}
              classes={{
                node: (node: GraphNode<TestNode>) => selected.has(node.id) ? 'selected' : undefined
              }}
              onSelect={(node: GraphNode<TestNode>) => {
                if (selected.has(node.id)) {
                  selected.delete(node.id);
                } else {
                  selected.add(node.id);
                }

                model.model.update();
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};
