//
// Copyright 2020 DXOS.org
//

// import update from 'immutability-helper';
import React from 'react';
// import useResizeAware from 'react-resize-aware';

import { SVGContextProvider } from '@dxos/gem-core';
// import {
//   Graph,
//   Markers
// } from '@dxos/gem-spore';

import { GraphData } from '../../models';

// const useStyles = makeStyles(() => ({
//   root: {
//     display: 'flex',
//     flex: 1,
//     position: 'relative' // Important.
//   }
// }));

export interface GraphViewProps {
  data: GraphData,
  classes?: any,
  onCreate?: Function,
  onSelect?: Function,
  propertyAdapter?: Function
}

export const GraphView = ({
  data,
  classes = {},
  onSelect = () => {},
  onCreate = () => {},
  propertyAdapter = () => ({})
}: GraphViewProps) => {
  // const clazzes = { ...useStyles(), ...classes };

  // const [resizeListener, size] = useResizeAware();
  // const { width, height } = size;

  // const grid = useGrid({ width, height });
  // const [nodeProjector] = useState(() => new NodeProjector({ node: { showLabels: true, propertyAdapter } }));
  // const [linkProjector] = useState(() => new LinkProjector({ nodeRadius: 8, showArrows: true }));
  // const [layout] = useState(() => new ForceLayout());
  // const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey' }));

  // useEffect(() => {
  //   const handler = ({ source }: any) => onSelect(source.id);
  //   drag.on('click', handler);
  //   return () => drag.off('click', handler);
  // }, [drag]);

  return (
    <SVGContextProvider>
      <svg>

      </svg>
    </SVGContextProvider>
  );

  /*
  return (
    <div className={clazzes.root}>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Markers arrowSize={10} />
        <GraphLinker
          grid={grid}
          drag={drag}
          onUpdate={(mutations: any) => onCreate((update({ nodes: [], links: [] }, mutations)))}
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
  */
};
