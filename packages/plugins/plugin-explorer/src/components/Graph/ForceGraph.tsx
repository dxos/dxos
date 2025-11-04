//
// Copyright 2023 DXOS.org
//

import { forceLink, forceManyBody } from 'd3';
import NativeForceGraph from 'force-graph';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SearchResult, filterObjectsSync } from '@dxos/plugin-search';
import { type SpaceGraphModel } from '@dxos/schema';

import { GraphAdapter } from './adapter';

export type ForceGraphProps = {
  model?: SpaceGraphModel;
  match?: RegExp;
};

export const ForceGraph: FC<ForceGraphProps> = ({ model, match }) => {
  const { ref, width, height } = useResizeDetector({ refreshRate: 200 });
  const rootRef = useRef<HTMLDivElement>(null);
  const forceGraph = useRef<NativeForceGraph>(null);

  const filteredRef = useRef<SearchResult[]>([]);
  filteredRef.current = filterObjectsSync(model?.objects ?? [], match);

  const [data, setData] = useState<GraphAdapter>();
  useEffect(
    () =>
      model?.subscribe((model) => {
        setData(new GraphAdapter(model.graph));
      }),
    [model],
  );

  useEffect(() => {
    if (rootRef.current) {
      // https://github.com/vasturiano/force-graph
      // https://github.com/vasturiano/3d-force-graph
      forceGraph.current = new NativeForceGraph(rootRef.current)
        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#node-styling
        .nodeRelSize(6)
        .nodeLabel((node: any) => (node.type === 'schema' ? node.data.typename : (node.data.label ?? node.id)))
        .nodeAutoColorBy((node: any) => (node.type === 'schema' ? 'schema' : node.data.typename))

        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#link-styling
        .linkAutoColorBy((link: any) => link.type);
    }

    return () => {
      forceGraph.current?.pauseAnimation().graphData({ nodes: [], links: [] });
      forceGraph.current = null;
    };
  }, []);

  useEffect(() => {
    if (!data || !width || !height || !forceGraph.current) {
      return;
    }

    // https://github.com/vasturiano/force-graph?tab=readme-ov-file#container-layout
    forceGraph.current
      .pauseAnimation()
      .width(width)
      .height(height)
      .onEngineStop(() => {
        handleZoomToFit();
      })
      .onNodeClick((node: any) => {
        forceGraph.current?.emitParticle(node);
      })

      // https://github.com/vasturiano/force-graph?tab=readme-ov-file#force-engine-d3-force-configuration
      // .d3Force('center', forceCenter().strength(0.9))
      .d3Force('link', forceLink().distance(160).strength(0.5))
      .d3Force('charge', forceManyBody().strength(-30))

      .graphData(data)
      .warmupTicks(100)
      .cooldownTime(1_000)
      .resumeAnimation();
  }, [data, width, height, forceGraph.current]);

  const handleZoomToFit = () => {
    forceGraph.current?.zoomToFit(400, 40);
  };

  return (
    <div ref={ref} className='relative grow' onClick={handleZoomToFit}>
      <div ref={rootRef} className='absolute inset-0' />
    </div>
  );
};
