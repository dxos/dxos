//
// Copyright 2020 DXOS.org
//

import update from 'immutability-helper';
import React, { useState, useEffect } from 'react';
import useResizeAware from 'react-resize-aware';

import { makeStyles } from '@material-ui/core/styles';

import { SVG, useGrid } from '@dxos/gem-core';
import {
  createSimulationDrag,
  Graph,
  GraphLinker,
  ForceLayout,
  LinkProjector,
  NodeProjector,
  Markers
} from '@dxos/gem-spore';

// TODO(burdon): Create container.
const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flex: 1,
    position: 'relative' // Important
  }
}));

// TODO(burdon): Move to gem.
interface Node {
  id: string
  title: string | undefined
}

interface Link {
  id: string
  source: Node | string
  target: Node | string
}

interface Data {
  nodes: Node[]
  links: Link[]
}

interface LinksGraphProps {
  data: Data,
  onCreate?: Function,
  onSelect?: Function,
  classes?: any,
  propertyAdapter?: Function
}

const GraphView = ({
  data, onSelect = () => {}, onCreate = () => {}, classes = {}, propertyAdapter = () => ({})
}: LinksGraphProps) => {
  const clazzes = { ...useStyles(), ...classes }; // TODO(burdon): merge()
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const [nodeProjector] = useState(() => new NodeProjector({ node: { showLabels: true, propertyAdapter } }));
  const [linkProjector] = useState(() => new LinkProjector({ nodeRadius: 8, showArrows: true }));
  const [layout] = useState(() => new ForceLayout());
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey' }));

  useEffect(() => {
    const handler = ({ source }) => onSelect(source.id);
    drag.on('click', handler);
    return () => drag.off('click', handler);
  }, [drag])

  return (
    <div className={clazzes.root}>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Markers arrowSize={10}/>
        <GraphLinker
          grid={grid}
          drag={drag}
          onUpdate={mutations => onCreate((update({ nodes: [], links: [] }, mutations)))}
        />
        <Graph
          grid={grid}
          data={data}
          layout={layout}
          drag={drag}
          nodeProjector={nodeProjector}
          linkProjector={linkProjector}
          classes={{
            nodes: clazzes.nodes
          }}
        />
      </SVG>
    </div>
  );
};

export default GraphView;
