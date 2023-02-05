//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { SVG, SVGContextProvider, useSvgContext, Zoom } from '@dxos/gem-core';
import { GraphLayoutNode, GraphModel, GraphNode, GraphRenderer, Markers } from '@dxos/gem-spore';
import { mx } from '@dxos/react-components';

import { TreeProjector } from './tree-projector';

// TODO(burdon): Factor testing out of gem-spore/testing
// TODO(burdon): Generate typed tree data.
// TODO(burdon): Layout around focused element (up/down); hide distant items.
//  - foucs, inner ring of separated typed-collections, collection children (evenly spaced like dendrogram).
//  - large collections (scroll/zoom/lens?)
//  - square off leaf nodes (HTML list blocks) with radial lines into circles
//  - card on left; related cards on right
//  - search

export type PlexusProps<N extends GraphNode> = {
  model: GraphModel<N>;
};

export const Plexus = <N extends GraphNode>({ model }: PlexusProps<N>) => {
  return (
    <SVGContextProvider>
      <SVG className={mx('bg-slate-800')}>
        <Markers />
        {/* <Grid axis className='bg-black [&>path]:stroke-slate-700' /> */}
        <Zoom extent={[1, 4]}>
          {/* <GemGraph model={model} drag arrows /> */}
          <PlexGraph
            className={mx(
              '[&>g>g>circle]:fill-slate-800 [&>g>g>circle]:stroke-[2px] [&>g>g>circle]:stroke-slate-300',
              '[&>g>g>text]:fill-slate-500',
              '[&>g>g>path]:stroke-[3px] [&>g>g>path]:stroke-slate-700'
            )}
            model={model}
          />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};

export type PlexGraphProps<N extends GraphNode> = {
  model: GraphModel<N>;
  className?: string;
};

export const PlexGraph = <N extends GraphNode>({ model, className }: PlexGraphProps<N>) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>(null);

  const renderer = useMemo(
    () =>
      new GraphRenderer(context, graphRef, {
        transition: () => d3.transition().duration(500).ease(d3.easeLinear),
        labels: {
          text: (node) => node.id.slice(0, 8)
        },
        onNodeClick: (node: GraphLayoutNode<N>) => {
          model.setSelected(node.id);
        }
      }),
    []
  );

  const projector = useMemo(
    () =>
      new TreeProjector<N>(context, {
        radius: 200,
        nodeRadius: 16
      }),
    []
  );

  const [data, setData] = useState(model.graph);
  useEffect(() => {
    model.subscribe((graph) => {
      setData({ ...graph });
    });
  }, [model]);

  useEffect(() => {
    // In devtools: Reveal in elements panel.
    // console.log('ROOT', graphRef.current);

    if (graphRef.current) {
      projector.update(model.graph, model.selected);
      renderer.update(projector.layout);
    }
  }, [graphRef, data]);

  return <g ref={graphRef} className={className} />;
};
