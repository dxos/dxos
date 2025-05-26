//
// Copyright 2023 DXOS.org
//

import { forceLink, forceManyBody } from 'd3';
import ForceGraph, { type NodeObject, type LinkObject, type GraphData } from 'force-graph';
import React, { type FC, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { filterObjectsSync, type SearchResult } from '@dxos/plugin-search';
import { useAsyncState } from '@dxos/react-ui';

import { SpaceGraphModel } from './model';

export type GraphProps = {
  space: Space;
  match?: RegExp;
};

export const Graph: FC<GraphProps> = ({ space, match }) => {
  const { ref, width, height } = useResizeDetector({ refreshRate: 200 });
  const rootRef = useRef<HTMLDivElement>(null);
  const forceGraph = useRef<ForceGraph>();

  const [model] = useAsyncState(
    async () => (space ? new SpaceGraphModel({}, { schema: true }).open(space) : undefined),
    [space],
  );

  const filteredRef = useRef<SearchResult[]>();
  filteredRef.current = filterObjectsSync(model?.objects ?? [], match);

  useEffect(() => {
    if (rootRef.current) {
      // https://github.com/vasturiano/force-graph
      // https://github.com/vasturiano/3d-force-graph
      forceGraph.current = new ForceGraph(rootRef.current)
        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#node-styling
        .nodeRelSize(6)
        .nodeLabel((node: any) => (node.type === 'schema' ? node.data.typename : node.id))
        .nodeAutoColorBy((node: any) => (node.type === 'schema' ? 'schema' : node.data.typename))

        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#link-styling
        .linkColor(() => 'rgba(255,255,255,0.25)');
    }

    return () => {
      forceGraph.current?.pauseAnimation().graphData({ nodes: [], links: [] });
      forceGraph.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (forceGraph.current && width && height && model) {
      // https://github.com/vasturiano/force-graph?tab=readme-ov-file#container-layout
      forceGraph.current
        .pauseAnimation()
        .width(width)
        .height(height)
        .onEngineStop(() => {
          handleZoomToFit();
        })
        .onNodeClick((node: any) => {
          log.info('click', { node });
          forceGraph.current?.emitParticle(node);
        })

        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#force-engine-d3-force-configuration
        // .d3Force('center', forceCenter().strength(0.9))
        .d3Force('link', forceLink().distance(160).strength(0.5))
        .d3Force('charge', forceManyBody().strength(-30))
        // .d3AlphaDecay(0.0228)
        // .d3VelocityDecay(0.4)

        .graphData(new GraphDataAdapter(model))
        .warmupTicks(100)
        .cooldownTime(1_000)
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

class GraphDataAdapter implements GraphData {
  private readonly _nodes: NodeObject[] = [];
  private readonly _links: LinkObject[] = [];

  // TODO(burdon): Merge and make reactive.
  constructor(private readonly _model: SpaceGraphModel) {
    this._nodes = this._model.graph.nodes.map((node) => ({
      id: node.id,
      data: node.data,
    }));
    this._links = this._model.graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      data: edge,
    }));
  }

  get nodes() {
    return this._nodes;
  }

  get links() {
    return this._links;
  }
}
