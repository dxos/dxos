//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';
import { ForceGraph3D } from 'react-force-graph';
import faker from 'faker';

import { createGraph } from '@dxos/gem-spore';

export default {
  title: 'experimental/force-graph'
};

/**
 * https://www.npmjs.com/package/react-force-graph
 * @param distance
 */
export const Primary = ({ distance = 1000 }) => {
  const graph = useRef(null);
  const [data] = useState(() => createGraph(faker.random.number(64), faker.random.number(64)));

  // Rotation.
  useEffect(() => {
    if (!graph.current.cameraPosition) {
      return;
    }

    graph.current.cameraPosition({ z: distance });

    // camera orbit
    let angle = 0;
    const interval = setInterval(() => {
      graph.current.cameraPosition({
        x: distance * Math.sin(angle),
        z: distance * Math.cos(angle)
      });

      // TODO(burdon): By time.
      angle += Math.PI / 300;
      if (distance > 750) {
        distance -= 1;
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // TODO(burdon): Auto-size.
  // https://github.com/vasturiano/react-force-graph/blob/master/src/forcegraph-proptypes.js

  return (
    <ForceGraph3D
      backgroundColor="#FFF"
      ref={graph}
      graphData={data}
      enableNodeDrag={false}
      enableNavigationControls={true}
      showNavInfo={true}
      nodeRelSize={5}
      nodeLabel={node => String(node.id)}
      nodeColor={() => '#999'}
      linkColor={() => '#333'}
      linkWidth={1}
    />
  );
};
