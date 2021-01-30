//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { button, withKnobs } from '@storybook/addon-knobs';

import {
  FullScreen,
  Grid,
  SVG,
  convertTreeToGraph,
  createTree,
  useGrid,
  useObjectMutator,
} from '@dxos/gem-core';

import {
  createSimulationDrag,
  ForceLayout,
  Graph,
  GraphLinker,
  LinkProjector,
  Markers,
  NodeProjector,
} from '../src';

export default {
  title: 'Graph',
  decorators: [withKnobs]
};

debug.enable('dxos:spore:*');

//
// Actions
//

const useDataButton = (generate, label='Refresh') => {
  const [data, setData, getData, updateData] = useObjectMutator({});
  useEffect(() => {
    setData(generate());
  }, []);

  button(label, () => setData(generate()));
  return [data, setData, getData, updateData];
};

/**
 * Graph.
 */
export const withGraph = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [data,,, updateData] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 3 })));
  const [layout] = useState(() => new ForceLayout({ force: { links: { distance: 80 } } }));
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey', freeze: 'shiftKey' }));
  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({ node: { radius: 16, showLabels: false } }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
        <Markers />

        <GraphLinker
          grid={grid}
          drag={drag}
          linkProjector={linkProjector}
          onUpdate={updateData}
        />

        <Graph
          grid={grid}
          data={data}
          layout={layout}
          linkProjector={linkProjector}
          nodeProjector={nodeProjector}
          drag={drag}
        />
      </SVG>
    </FullScreen>
  );
};
