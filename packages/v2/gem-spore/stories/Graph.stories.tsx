//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { useMemo } from 'react';

import { FullScreen, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';

import {
  convertTreeToGraph,
  createTree,
  defaultGraphStyles,
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

export const Primary = () => {
  const selected = useMemo(() => new Set(), []);
  const adapter = useMemo(
    () => new TestGraphModelAdapter(new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 })))),
  []);

  // TODO(burdon): Hover/show label.
  // TODO(burdon): HOCs for Grid, Zoom, etc.
  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom extent={[1/2, 2]}>
            <Graph
              className={clsx(defaultGraphStyles)}
              drag
              arrows
              model={adapter}
              label={(node: GraphNode<TestNode>) => selected.has(node.id) ? node.data.label : undefined}
              nodeClass={(node: GraphNode<TestNode>) => selected.has(node.id) ? 'selected' : undefined}
              onSelect={(node: GraphNode<TestNode>) => {
                if (selected.has(node.id)) {
                  selected.delete(node.id);
                } else {
                  selected.add(node.id);
                }

                adapter.model.update();
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};
