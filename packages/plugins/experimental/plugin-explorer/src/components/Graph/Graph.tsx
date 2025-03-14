//
// Copyright 2023 DXOS.org
//

import { forceLink, forceManyBody } from 'd3';
import ForceGraph from 'force-graph';
import React, { type FC, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type Space } from '@dxos/client/echo';
import { filterObjectsSync, type SearchResult } from '@dxos/plugin-search';
import { useAsyncState } from '@dxos/react-ui';

import { SpaceGraphModel } from './graph-model';

export type GraphProps = {
  space: Space;
  match?: RegExp;
};

export const Graph: FC<GraphProps> = ({ space, match }) => {
  const { ref, width, height } = useResizeDetector({ refreshRate: 200 });
  const rootRef = useRef<HTMLDivElement>(null);
  const forceGraph = useRef<ForceGraph>();

  const [model] = useAsyncState(
    async () => (space ? new SpaceGraphModel({ schema: true }).open(space) : undefined),
    [space],
  );

  const filteredRef = useRef<SearchResult[]>();
  filteredRef.current = filterObjectsSync(model?.objects ?? [], match);

  useEffect(() => {
    if (rootRef.current) {
      // https://github.com/vasturiano/force-graph
      forceGraph.current = new ForceGraph(rootRef.current)
        .nodeRelSize(6)
        .nodeLabel((node: any) => {
          if (node.type === 'schema') {
            return node.data.typename;
          }

          return node.id;
        })
        .nodeAutoColorBy((node: any) => (node.type === 'schema' ? 'schema' : node.data.typename))
        .linkColor(() => 'rgba(255,255,255,0.25)');
    }

    return () => {
      forceGraph.current?.pauseAnimation().graphData({ nodes: [], links: [] });
      forceGraph.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (forceGraph.current && width && height && model) {
      forceGraph.current
        .pauseAnimation()
        .width(width)
        .height(height)
        .onEngineStop(() => {
          handleZoomToFit();
        })

        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#force-engine-d3-force-configuration
        // .d3Force('center', forceCenter().strength(0.9))
        .d3Force('link', forceLink().distance(160).strength(0.5))
        .d3Force('charge', forceManyBody().strength(-30))
        // .d3AlphaDecay(0.0228)
        // .d3VelocityDecay(0.4)

        .graphData(model.graph)
        .warmupTicks(100)
        .cooldownTime(1000)
        .resumeAnimation();
    }
  }, [model, width, height]);

  const handleZoomToFit = () => {
    forceGraph.current?.zoomToFit(400, 40);
  };

  return (
    <div ref={ref} className='relative grow' onClick={handleZoomToFit}>
      <div ref={rootRef} className='absolute inset-0' />
    </div>
  );
};
