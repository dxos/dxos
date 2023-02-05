//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Grid, SVG, SVGContextProvider, useSvgContext, Zoom } from '@dxos/gem-core';
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
  onSelect?: (node: N) => void;
};

export const Plexus = <N extends GraphNode>({ model, onSelect }: PlexusProps<N>) => {
  const [visible, setVisible] = useState(true);
  const handleSelect = (node: N) => {
    onSelect?.(node);
    setVisible(false);
    setTimeout(() => {
      setVisible(true);
    }, 500);
  };

  return (
    <SVGContextProvider>
      <SVG className={mx('bg-slate-800')}>
        <Markers
          arrowSize={3}
          className='[&>marker>path]:stroke-slate-600 [&>marker>path]:stroke-[0.5px] [&>marker>path]:fill-transparent'
        />
        <Grid axis className='bg-black [&>path]:stroke-[1px] [&>path]:stroke-slate-700 [&>path]:opacity-40' />
        <Zoom extent={[1, 4]}>
          <g className={mx('fill-slate-900 stroke-[3px] stroke-slate-700 visible', !visible && 'invisible')}>
            <line x1={0} y1={0} x2={600} y2={0} />
          </g>
          <PlexGraph
            className={mx(
              '[&>g>g>circle]:fill-slate-800 [&>g>g>circle]:stroke-[2px] [&>g>g>circle]:stroke-slate-300',
              '[&>g>g>text]:fill-slate-500',
              '[&>g>g>path]:stroke-[3px] [&>g>g>path]:stroke-slate-700'
            )}
            model={model}
            onSelect={handleSelect}
          />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};

export type PlexGraphProps<N extends GraphNode> = {
  model: GraphModel<N>;
  className?: string;
  onSelect?: (node: N) => void;
};

export const PlexGraph = <N extends GraphNode>({ model, className, onSelect }: PlexGraphProps<N>) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>(null);

  // Layout projector.
  const projector = useMemo(
    () =>
      new TreeProjector<N>(context, {
        radius: 200,
        nodeRadius: 16
      }),
    []
  );

  // Graph renderer.
  const renderer = useMemo(
    () =>
      new GraphRenderer(context, graphRef, {
        transition: () => d3.transition().duration(300).ease(d3.easeLinear),
        labels: {
          text: (node) => node.id.slice(0, 8) // + `[${node.data.label}]`
        },
        arrows: { end: true },
        onNodeClick: (node: GraphLayoutNode<N>) => {
          onSelect?.(node.data!);
        }
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
